import { describe, expect, it } from 'vitest';
import {
  BASE_CLICK_METRES,
  autoSpeedMps,
  bulkCost,
  costOf,
  isUnlocked,
  metresPerClick,
  nextUnlockAtLaps,
  unlockedUpgrades,
  xpPerLap,
  xpPerMinute,
  xpPerSecond,
} from './formulas';
import { getTrack } from './data/tracks';
import { UPGRADES, getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';
import { createInitialState } from './state';

const gears = getUpgrade('biggerGears');

function withLevels(levels: Partial<Record<UpgradeId, number>>) {
  const state = createInitialState(0);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(gears, 0).toNumber()).toBe(1);
  });

  it('grows geometrically, on whole rungs', () => {
    // Math.round(1.9 ** n): the curve is untouched, only quoted in whole XP.
    expect(costOf(gears, 1).toNumber()).toBe(2);
    expect(costOf(gears, 5).toNumber()).toBe(Math.round(1.9 ** 5));
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => costOf(gears, n).toNumber())).toEqual([
      1, 2, 4, 7, 13, 25, 47,
    ]);
  });

  it('never quotes the same price twice, however shallow the growth', () => {
    // Auto-pedal's 1.15 on a base of 3 steps by less than an XP for its first
    // several levels — 3, 3.45, 3.97, 4.56 — which would round to 3, 3, 4, 5
    // and read as a ladder that is not moving. The floor of baseCost + level
    // carries it until the curve is steep enough to take over on its own.
    const autoPedal = getUpgrade('autoPedal');
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((n) => costOf(autoPedal, n).toNumber())).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10,
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
    for (let n = 3; n < 3 + 7; n++) sum += costOf(gears, n).toNumber();
    expect(bulkCost(gears, 3, 7).toNumber()).toBe(sum);
    expect(bulkCost(gears, 3, 0).toNumber()).toBe(0);
  });

  it('prices the first upgrade at one lap of the starting track', () => {
    // The whole point of bigger gears' base cost: exactly one lap's XP, so it is
    // affordable the moment lap one lands, and it is the only upgrade on show
    // until then.
    expect(costOf(gears, 0).eq(xpPerLap(createInitialState(0)))).toBe(true);
    expect(gears.unlockAtLaps).toBe(0);
  });
});

describe('autoSpeedMps', () => {
  it('is zero until auto-pedal is bought, then stacks per level', () => {
    expect(autoSpeedMps(createInitialState(0))).toBe(0);
    expect(autoSpeedMps(withLevels({ autoPedal: 1 }))).toBe(0.5);
    expect(autoSpeedMps(withLevels({ autoPedal: 4 }))).toBe(2);
  });

  it('ignores XP upgrades', () => {
    expect(autoSpeedMps(withLevels({ betterBike: 3 }))).toBe(0);
  });
});

describe('xpPerLap', () => {
  it('pays one XP for a lap of the backyard', () => {
    // 30 m at 1/30 XP a metre: one lap, one XP.
    expect(xpPerLap(createInitialState(0)).toNumber()).toBe(1);
  });

  it('multiplies per xpMult level and ignores speed levels', () => {
    // Rounded up to a whole XP: the raw 1.5 and 2.25 would both show as the
    // same number on a screen that never prints a fraction.
    expect(xpPerLap(withLevels({ betterBike: 1 })).toNumber()).toBe(2);
    expect(xpPerLap(withLevels({ betterBike: 2 })).toNumber()).toBe(3);
    expect(xpPerLap(withLevels({ autoPedal: 9 })).toNumber()).toBe(1);
  });

  it('moves every single level, and never by a fraction', () => {
    // The property the ceiling buys: no level of the tyres is invisible. The
    // 1.5 curve is still underneath — 1, 1.5, 2.25, 3.375, 5.06, 7.59, 11.39 —
    // and the rounding is applied once at the end rather than compounded.
    const payouts = [0, 1, 2, 3, 4, 5, 6].map((level) =>
      xpPerLap(withLevels({ betterBike: level })).toNumber(),
    );
    expect(payouts).toEqual([1, 2, 3, 4, 6, 8, 12]);
    for (const xp of payouts) expect(Number.isInteger(xp)).toBe(true);
  });
});

describe('xpPerSecond', () => {
  it('is zero while nothing pedals by itself', () => {
    expect(xpPerSecond(createInitialState(0)).toNumber()).toBe(0);
    expect(xpPerSecond(withLevels({ betterBike: 2 })).toNumber()).toBe(0);
  });

  it('is laps per second times XP per lap', () => {
    // 0.5 m/s round a 30 m lap: a lap, and so an XP, every minute.
    expect(xpPerSecond(withLevels({ autoPedal: 1 })).toNumber()).toBeCloseTo(1 / 60, 9);
    expect(xpPerSecond(withLevels({ autoPedal: 1, betterBike: 1 })).toNumber()).toBeCloseTo(
      2 / 60,
      9,
    );
  });

  it('reduces to metres per second times xpPerMetre, whatever the lap length', () => {
    // xpPerLap is proportional to lapDistanceM, so lap distance cancels out of
    // the rate. A longer track pays the same per second, in rarer chunks.
    const state = withLevels({ autoPedal: 4 });
    const { xpPerMetre } = getTrack(state.trackId);
    expect(xpPerSecond(state).toNumber()).toBeCloseTo(autoSpeedMps(state) * xpPerMetre, 9);
  });
});

describe('xpPerMinute', () => {
  it('is the readout unit: a whole XP at the first level of auto-pedal', () => {
    // The reason the header counts in minutes rather than seconds. Per second
    // this is 0.0167, which rounds away to nothing on a whole-number readout.
    expect(xpPerMinute(withLevels({ autoPedal: 1 })).toNumber()).toBeCloseTo(1, 6);
    expect(xpPerMinute(createInitialState(0)).toNumber()).toBe(0);
  });

  it('is sixty times the per-second rate', () => {
    const state = withLevels({ autoPedal: 4, betterBike: 2 });
    expect(xpPerMinute(state).toNumber()).toBeCloseTo(xpPerSecond(state).toNumber() * 60, 6);
  });
});

describe('metresPerClick', () => {
  it('starts at the base and grows one metre per gear level', () => {
    expect(metresPerClick(createInitialState(0))).toBe(BASE_CLICK_METRES);
    expect(metresPerClick(withLevels({ biggerGears: 1 }))).toBe(2);
    expect(metresPerClick(withLevels({ biggerGears: 4 }))).toBe(5);
  });

  it('is untouched by the other upgrades', () => {
    expect(metresPerClick(withLevels({ autoPedal: 5, betterBike: 5, slipstream: 5 }))).toBe(
      BASE_CLICK_METRES,
    );
  });
});

describe('slipstream', () => {
  it('multiplies the auto-speed it is bought on top of', () => {
    expect(autoSpeedMps(withLevels({ autoPedal: 4, slipstream: 1 }))).toBeCloseTo(2 * 1.2, 9);
    expect(autoSpeedMps(withLevels({ autoPedal: 4, slipstream: 3 }))).toBeCloseTo(2 * 1.2 ** 3, 9);
  });

  it('is worth nothing while nothing pedals by itself', () => {
    expect(autoSpeedMps(withLevels({ slipstream: 5 }))).toBe(0);
  });
});

describe('training partner', () => {
  it('adds clicks a second, each worth a full metresPerClick', () => {
    // 0.5 clicks a second at 1 m a click.
    expect(autoSpeedMps(withLevels({ trainingPartner: 1 }))).toBeCloseTo(0.5, 9);
    // Gears make the partner's clicks carry further too: 0.5 clicks × 3 m.
    expect(autoSpeedMps(withLevels({ trainingPartner: 1, biggerGears: 2 }))).toBeCloseTo(1.5, 9);
    expect(autoSpeedMps(withLevels({ trainingPartner: 4, biggerGears: 2 }))).toBeCloseTo(6, 9);
  });

  it('stacks additively with auto-pedal before the multiplier applies', () => {
    // (0.5 auto-pedal + 0.5 clicks × 2 m) × 1.2
    expect(
      autoSpeedMps(withLevels({ autoPedal: 1, trainingPartner: 1, biggerGears: 1, slipstream: 1 })),
    ).toBeCloseTo((0.5 + 1) * 1.2, 9);
  });

  it('feeds the XP readout like any other speed', () => {
    const state = withLevels({ trainingPartner: 2, biggerGears: 2 });
    // 1 click/s × 3 m = 3 m/s, a tenth of a 30 m lap a second.
    expect(xpPerSecond(state).toNumber()).toBeCloseTo(0.1, 9);
  });
});

describe('unlocks', () => {
  it('shows only bigger gears in an empty backyard', () => {
    expect(unlockedUpgrades(0).map((d) => d.id)).toEqual(['biggerGears']);
  });

  it('opens each upgrade at its lap count', () => {
    expect(unlockedUpgrades(1).map((d) => d.id)).toEqual(['biggerGears', 'autoPedal']);
    expect(unlockedUpgrades(2).map((d) => d.id)).toEqual(['biggerGears', 'autoPedal']);
    expect(unlockedUpgrades(3).map((d) => d.id)).toEqual([
      'biggerGears',
      'autoPedal',
      'betterBike',
    ]);
    expect(unlockedUpgrades(10)).toHaveLength(4);
    expect(unlockedUpgrades(20)).toHaveLength(5);
    // Nothing hides again once the whole shed is out.
    expect(unlockedUpgrades(1000)).toHaveLength(5);
  });

  it('counts down the laps to the next reveal, then stops', () => {
    expect(nextUnlockAtLaps(0)).toBe(1);
    expect(nextUnlockAtLaps(1)).toBe(3);
    expect(nextUnlockAtLaps(3)).toBe(10);
    expect(nextUnlockAtLaps(10)).toBe(20);
    expect(nextUnlockAtLaps(20)).toBeNull();
    expect(nextUnlockAtLaps(999)).toBeNull();
  });

  it('reads the gate off the state', () => {
    const state = createInitialState(0);
    expect(isUnlocked(state, getUpgrade('autoPedal'))).toBe(false);
    expect(isUnlocked({ ...state, totalLaps: 1 }, getUpgrade('autoPedal'))).toBe(true);
    expect(isUnlocked(state, getUpgrade('biggerGears'))).toBe(true);
  });
});
