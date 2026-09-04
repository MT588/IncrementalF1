import { describe, expect, it } from 'vitest';
import {
  BASE_SPEED_KPH,
  bulkCost,
  costOf,
  isUnlocked,
  lapsToRaces,
  nextUnlockAtLaps,
  speedKph,
  speedMps,
  unlockedUpgrades,
  xpPerLap,
  xpPerMinute,
  xpPerSecond,
} from './formulas';
import { getTrack } from './data/tracks';
import { RACE_UNLOCK_LAPS } from './data/races';
import { UPGRADES, getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';
import { createInitialState } from './state';

const throttle = getUpgrade('throttle');
const tyres = getUpgrade('racingTyres');
const engine = getUpgrade('biggerEngine');

function withLevels(levels: Partial<Record<UpgradeId, number>>) {
  const state = createInitialState(0);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(throttle, 0).toNumber()).toBe(1);
    expect(costOf(engine, 0).toNumber()).toBe(10);
  });

  it('grows geometrically, on whole rungs', () => {
    // Math.round(10 × 1.9 ** n): the curve is untouched, only quoted in whole XP.
    expect(costOf(engine, 1).toNumber()).toBe(19);
    expect(costOf(engine, 5).toNumber()).toBe(Math.round(10 * 1.9 ** 5));
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => costOf(engine, n).toNumber())).toEqual([
      10, 19, 36, 69, 130, 248, 470,
    ]);
  });

  it('never quotes the same price twice, however shallow the growth', () => {
    // The throttle's 1.45 on a base of 1 steps by less than an XP for its first
    // several levels — 1, 1.45, 2.1, 3.05 — which would round to 1, 1, 2, 3 and
    // read as a ladder that is not moving. The floor of baseCost + level carries
    // it until the curve is steep enough to take over on its own, which it does
    // at the sixth rung and never gives back.
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => costOf(throttle, n).toNumber())).toEqual([
      1, 2, 3, 4, 5, 6, 9, 13, 20, 28, 41,
    ]);
  });

  it('quotes every upgrade in whole, strictly rising XP', () => {
    for (const def of UPGRADES) {
      let previous = 0;
      for (let level = 0; level < 200; level++) {
        const cost = costOf(def, level).toNumber();
        // Whole to within a Decimal's mantissa-and-exponent round trip, which
        // reconstructs 848,430 as 848429.9999999999 and drifts proportionally
        // with the magnitude. formatNumber rounds to the nearest for the same
        // reason, so it is the rounded value that has to be a rising integer.
        expect(Math.abs(cost - Math.round(cost))).toBeLessThan(Math.max(1e-6, cost * 1e-9));
        expect(Math.round(cost)).toBeGreaterThan(previous);
        previous = Math.round(cost);
      }
    }
  });

  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let n = 3; n < 3 + 7; n++) sum += costOf(tyres, n).toNumber();
    expect(bulkCost(tyres, 3, 7).toNumber()).toBe(sum);
    expect(bulkCost(tyres, 3, 0).toNumber()).toBe(0);
  });

  it('prices the first upgrade at one lap of the starting track', () => {
    // The whole point of the throttle's base cost: exactly one lap's XP, so it
    // is affordable the moment lap one lands, and it is the only upgrade on
    // show until then.
    expect(costOf(throttle, 0).eq(xpPerLap(createInitialState(0)))).toBe(true);
    expect(throttle.unlockAtLaps).toBe(0);
  });
});

describe('speedKph', () => {
  it('starts at the base speed, with nothing bought at all', () => {
    // There is no manual action: this is what makes the game move on load, and
    // 2.4 km/h is a potter rather than a racing pace.
    expect(speedKph(createInitialState(0))).toBe(BASE_SPEED_KPH);
    expect(BASE_SPEED_KPH).toBe(2.4);
  });

  it('adds the throttle and the engine to it', () => {
    expect(speedKph(withLevels({ throttle: 1 }))).toBeCloseTo(2.9, 9);
    expect(speedKph(withLevels({ throttle: 4 }))).toBeCloseTo(4.4, 9);
    expect(speedKph(withLevels({ biggerEngine: 1 }))).toBeCloseTo(4.4, 9);
    expect(speedKph(withLevels({ throttle: 2, biggerEngine: 1 }))).toBeCloseTo(5.4, 9);
  });

  it('ignores XP upgrades', () => {
    expect(speedKph(withLevels({ racingTyres: 3, raceCraft: 2 }))).toBe(BASE_SPEED_KPH);
  });
});

describe('speedMps', () => {
  it('is the km/h speed in the unit the simulation moves in', () => {
    // The whole reason both exist: the panel reads km/h, addDistance takes metres.
    expect(speedMps(createInitialState(0))).toBeCloseTo(2.4 / 3.6, 12);
    const state = withLevels({ throttle: 2, biggerEngine: 1 });
    expect(speedMps(state)).toBeCloseTo(speedKph(state) / 3.6, 12);
  });

  it('covers a lap of the backyard in fifteen seconds from cold', () => {
    expect(speedMps(createInitialState(0)) * 15).toBeCloseTo(10, 9);
  });
});

describe('xpPerLap', () => {
  it('pays one XP for a lap of the backyard', () => {
    // 10 m at 1/10 XP a metre: one lap, one XP.
    expect(xpPerLap(createInitialState(0)).toNumber()).toBe(1);
  });

  it('adds a flat XP per level of tyres', () => {
    // Flat rather than multiplied, so the very first level is worth the whole
    // payout again instead of half an XP the ceiling would swallow.
    expect(xpPerLap(withLevels({ racingTyres: 1 })).toNumber()).toBe(2);
    expect(xpPerLap(withLevels({ racingTyres: 2 })).toNumber()).toBe(3);
    expect(
      [0, 1, 2, 3, 4, 5].map((n) => xpPerLap(withLevels({ racingTyres: n })).toNumber()),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('multiplies per level of race craft, and ignores speed levels', () => {
    // Rounded up to a whole XP: the raw 1.5 and 2.25 would both show as the
    // same number on a screen that never prints a fraction.
    expect(xpPerLap(withLevels({ raceCraft: 1 })).toNumber()).toBe(2);
    expect(xpPerLap(withLevels({ raceCraft: 2 })).toNumber()).toBe(3);
    expect(xpPerLap(withLevels({ throttle: 9, biggerEngine: 4 })).toNumber()).toBe(1);
  });

  it('adds the flat bonus before multiplying, so the two compound', () => {
    // (1 + 3 tyres) × 1.5 = 6, not 1 × 1.5 + 3 = 5. Race craft is worth more
    // for every level of tyres already owned, which is what makes the order
    // of operations a design decision rather than an accident.
    expect(xpPerLap(withLevels({ racingTyres: 3, raceCraft: 1 })).toNumber()).toBe(6);
    expect(xpPerLap(withLevels({ racingTyres: 3, raceCraft: 2 })).toNumber()).toBe(9);
  });

  it('moves every single level, and never by a fraction', () => {
    const payouts = [0, 1, 2, 3, 4, 5, 6].map((level) =>
      xpPerLap(withLevels({ raceCraft: level })).toNumber(),
    );
    expect(payouts).toEqual([1, 2, 3, 4, 6, 8, 12]);
    for (const xp of payouts) expect(Number.isInteger(xp)).toBe(true);
  });
});

describe('xpPerSecond', () => {
  it('is already earning before anything is bought', () => {
    // 2.4 km/h round a 10 m lap: a lap every fifteen seconds, an XP with it.
    expect(xpPerSecond(createInitialState(0)).toNumber()).toBeCloseTo(1 / 15, 9);
  });

  it('is laps per second times XP per lap', () => {
    const geared = withLevels({ throttle: 1 });
    expect(xpPerSecond(geared).toNumber()).toBeCloseTo(speedMps(geared) / 10, 9);
    // The tyres double the payout without touching the speed, so the rate doubles.
    const shod = withLevels({ throttle: 1, racingTyres: 1 });
    expect(xpPerSecond(shod).toNumber()).toBeCloseTo(xpPerSecond(geared).toNumber() * 2, 9);
  });

  it('reduces to metres per second times xpPerMetre, whatever the lap length', () => {
    // xpPerLap is proportional to lapDistanceM, so lap distance cancels out of
    // the rate. A longer track pays the same per second, in rarer chunks.
    const state = withLevels({ throttle: 4 });
    const { xpPerMetre } = getTrack(state.trackId);
    expect(xpPerSecond(state).toNumber()).toBeCloseTo(speedMps(state) * xpPerMetre, 9);
  });
});

describe('xpPerMinute', () => {
  it('is the readout unit: a whole XP a minute from the first second', () => {
    // The reason the header counts in minutes rather than seconds. Per second
    // an untouched kart earns 0.067, which rounds away to nothing on a
    // whole-number readout; per minute it reads 4.
    expect(xpPerMinute(createInitialState(0)).toNumber()).toBeCloseTo(4, 6);
  });

  it('is sixty times the per-second rate', () => {
    const state = withLevels({ throttle: 4, racingTyres: 2, raceCraft: 1 });
    expect(xpPerMinute(state).toNumber()).toBeCloseTo(xpPerSecond(state).toNumber() * 60, 6);
  });
});

describe('slipstream', () => {
  it('multiplies the whole speed, base included', () => {
    // Nothing else bought: it still has the kart's own 2.4 km/h to work on.
    expect(speedKph(withLevels({ slipstream: 1 }))).toBeCloseTo(2.4 * 1.1, 9);
    expect(speedKph(withLevels({ biggerEngine: 1, slipstream: 1 }))).toBeCloseTo(4.4 * 1.1, 9);
    expect(speedKph(withLevels({ biggerEngine: 1, slipstream: 3 }))).toBeCloseTo(4.4 * 1.1 ** 3, 9);
  });

  it('applies after the additive sources, not between them', () => {
    // (2.4 base + 0.5 throttle + 2 engine) × 1.1, rather than each multiplied apart.
    expect(speedKph(withLevels({ throttle: 1, biggerEngine: 1, slipstream: 1 }))).toBeCloseTo(
      4.9 * 1.1,
      9,
    );
  });
});

describe('unlocks', () => {
  it('shows only the throttle in an empty backyard', () => {
    expect(unlockedUpgrades(0).map((d) => d.id)).toEqual(['throttle']);
  });

  it('opens each upgrade at its lap count', () => {
    expect(unlockedUpgrades(2).map((d) => d.id)).toEqual(['throttle']);
    expect(unlockedUpgrades(3).map((d) => d.id)).toEqual(['throttle', 'racingTyres']);
    expect(unlockedUpgrades(8).map((d) => d.id)).toEqual([
      'throttle',
      'racingTyres',
      'biggerEngine',
    ]);
    expect(unlockedUpgrades(15)).toHaveLength(4);
    expect(unlockedUpgrades(20).map((d) => d.id)).toContain('raceCraft');
    // Nothing hides again once the whole shed is out.
    expect(unlockedUpgrades(1000)).toHaveLength(5);
  });

  it('counts down the laps to the next reveal, then stops', () => {
    expect(nextUnlockAtLaps(0)).toBe(3);
    expect(nextUnlockAtLaps(3)).toBe(8);
    expect(nextUnlockAtLaps(8)).toBe(15);
    expect(nextUnlockAtLaps(15)).toBe(20);
    expect(nextUnlockAtLaps(20)).toBeNull();
    expect(nextUnlockAtLaps(999)).toBeNull();
  });

  it('reads the gate off the state', () => {
    const state = createInitialState(0);
    expect(isUnlocked(state, tyres)).toBe(false);
    expect(isUnlocked({ ...state, totalLaps: 3 }, tyres)).toBe(true);
    expect(isUnlocked(state, throttle)).toBe(true);
  });
});

describe('lapsToRaces', () => {
  it('counts laps down to the gate and stops at zero', () => {
    expect(lapsToRaces(0)).toBe(RACE_UNLOCK_LAPS);
    expect(lapsToRaces(249)).toBe(1);
    expect(lapsToRaces(250)).toBe(0);
    // Never negative: the panel reads the number straight out.
    expect(lapsToRaces(400)).toBe(0);
  });

  it('opens races well after the whole shed is out', () => {
    // The last upgrade is revealed at 20 laps; races are an order of magnitude
    // further, so the panel is a goal rather than a formality.
    expect(RACE_UNLOCK_LAPS).toBeGreaterThan(Math.max(...UPGRADES.map((u) => u.unlockAtLaps)));
  });
});
