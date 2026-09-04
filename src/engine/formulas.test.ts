import { describe, expect, it } from 'vitest';
import {
  BASE_SPEED_MPS,
  bulkCost,
  costOf,
  isUnlocked,
  nextUnlockAtLaps,
  speedMps,
  unlockedUpgrades,
  xpPerLap,
  xpPerMinute,
  xpPerSecond,
} from './formulas';
import { getTrack } from './data/tracks';
import { UPGRADES, getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';
import { createInitialState } from './state';

const throttle = getUpgrade('throttle');
const tyres = getUpgrade('racingTyres');

function withLevels(levels: Partial<Record<UpgradeId, number>>) {
  const state = createInitialState(0);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(throttle, 0).toNumber()).toBe(1);
    expect(costOf(tyres, 0).toNumber()).toBe(5);
  });

  it('grows geometrically, on whole rungs', () => {
    // Math.round(5 × 1.6 ** n): the curve is untouched, only quoted in whole XP.
    expect(costOf(tyres, 1).toNumber()).toBe(8);
    expect(costOf(tyres, 5).toNumber()).toBe(Math.round(5 * 1.6 ** 5));
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => costOf(tyres, n).toNumber())).toEqual([
      5, 8, 13, 20, 33, 52, 84,
    ]);
  });

  it('never quotes the same price twice, however shallow the growth', () => {
    // The throttle's 1.3 on a base of 1 steps by less than an XP for its first
    // several levels — 1, 1.3, 1.69, 2.2 — which would round to 1, 1, 2, 2 and
    // read as a ladder that is not moving. The floor of baseCost + level carries
    // it until the curve is steep enough to take over on its own, which it does
    // at the tenth rung and never gives back.
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => costOf(throttle, n).toNumber())).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14,
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

describe('speedMps', () => {
  it('starts at the base speed, with nothing bought at all', () => {
    // There is no manual action: this is what makes the game move on load.
    expect(speedMps(createInitialState(0))).toBe(BASE_SPEED_MPS);
    expect(BASE_SPEED_MPS).toBe(1);
  });

  it('adds the throttle and the engine to it', () => {
    expect(speedMps(withLevels({ throttle: 1 }))).toBe(1.5);
    expect(speedMps(withLevels({ throttle: 4 }))).toBe(3);
    expect(speedMps(withLevels({ biggerEngine: 1 }))).toBe(3);
    expect(speedMps(withLevels({ throttle: 2, biggerEngine: 1 }))).toBe(4);
  });

  it('ignores XP upgrades', () => {
    expect(speedMps(withLevels({ racingTyres: 3 }))).toBe(BASE_SPEED_MPS);
  });
});

describe('xpPerLap', () => {
  it('pays one XP for a lap of the backyard', () => {
    // 10 m at 1/10 XP a metre: one lap, one XP.
    expect(xpPerLap(createInitialState(0)).toNumber()).toBe(1);
  });

  it('multiplies per xpMult level and ignores speed levels', () => {
    // Rounded up to a whole XP: the raw 1.5 and 2.25 would both show as the
    // same number on a screen that never prints a fraction.
    expect(xpPerLap(withLevels({ racingTyres: 1 })).toNumber()).toBe(2);
    expect(xpPerLap(withLevels({ racingTyres: 2 })).toNumber()).toBe(3);
    expect(xpPerLap(withLevels({ throttle: 9, biggerEngine: 4 })).toNumber()).toBe(1);
  });

  it('moves every single level, and never by a fraction', () => {
    // The property the ceiling buys: no level of the tyres is invisible. The
    // 1.5 curve is still underneath — 1, 1.5, 2.25, 3.375, 5.06, 7.59, 11.39 —
    // and the rounding is applied once at the end rather than compounded.
    const payouts = [0, 1, 2, 3, 4, 5, 6].map((level) =>
      xpPerLap(withLevels({ racingTyres: level })).toNumber(),
    );
    expect(payouts).toEqual([1, 2, 3, 4, 6, 8, 12]);
    for (const xp of payouts) expect(Number.isInteger(xp)).toBe(true);
  });
});

describe('xpPerSecond', () => {
  it('is already earning before anything is bought', () => {
    // 1 m/s round a 10 m lap: a tenth of a lap, and so a tenth of an XP, a second.
    expect(xpPerSecond(createInitialState(0)).toNumber()).toBeCloseTo(0.1, 9);
  });

  it('is laps per second times XP per lap', () => {
    expect(xpPerSecond(withLevels({ throttle: 1 })).toNumber()).toBeCloseTo(0.15, 9);
    expect(xpPerSecond(withLevels({ throttle: 1, racingTyres: 1 })).toNumber()).toBeCloseTo(0.3, 9);
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
    // an untouched kart earns 0.1, which rounds away to nothing on a
    // whole-number readout; per minute it reads 6.
    expect(xpPerMinute(createInitialState(0)).toNumber()).toBeCloseTo(6, 6);
    expect(xpPerMinute(withLevels({ throttle: 1 })).toNumber()).toBeCloseTo(9, 6);
  });

  it('is sixty times the per-second rate', () => {
    const state = withLevels({ throttle: 4, racingTyres: 2 });
    expect(xpPerMinute(state).toNumber()).toBeCloseTo(xpPerSecond(state).toNumber() * 60, 6);
  });
});

describe('slipstream', () => {
  it('multiplies the whole speed, base included', () => {
    // Nothing else bought: it still has the kart's own metre a second to work on.
    expect(speedMps(withLevels({ slipstream: 1 }))).toBeCloseTo(1.2, 9);
    expect(speedMps(withLevels({ throttle: 4, slipstream: 1 }))).toBeCloseTo(3 * 1.2, 9);
    expect(speedMps(withLevels({ throttle: 4, slipstream: 3 }))).toBeCloseTo(3 * 1.2 ** 3, 9);
  });

  it('applies after the additive sources, not between them', () => {
    // (1 base + 0.5 throttle + 2 engine) × 1.2, rather than each multiplied apart.
    expect(speedMps(withLevels({ throttle: 1, biggerEngine: 1, slipstream: 1 }))).toBeCloseTo(
      3.5 * 1.2,
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
    // Nothing hides again once the whole shed is out.
    expect(unlockedUpgrades(1000)).toHaveLength(4);
  });

  it('counts down the laps to the next reveal, then stops', () => {
    expect(nextUnlockAtLaps(0)).toBe(3);
    expect(nextUnlockAtLaps(3)).toBe(8);
    expect(nextUnlockAtLaps(8)).toBe(15);
    expect(nextUnlockAtLaps(15)).toBeNull();
    expect(nextUnlockAtLaps(999)).toBeNull();
  });

  it('reads the gate off the state', () => {
    const state = createInitialState(0);
    expect(isUnlocked(state, tyres)).toBe(false);
    expect(isUnlocked({ ...state, totalLaps: 3 }, tyres)).toBe(true);
    expect(isUnlocked(state, throttle)).toBe(true);
  });
});
