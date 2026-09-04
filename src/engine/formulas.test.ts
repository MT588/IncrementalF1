import { describe, expect, it } from 'vitest';
import {
  BASE_TAP_METRES,
  autoSpeedMps,
  bulkCost,
  costOf,
  isUnlocked,
  metresPerTap,
  nextUnlockAtLaps,
  unlockedUpgrades,
  xpPerLap,
  xpPerSecond,
} from './formulas';
import { getTrack } from './data/tracks';
import { getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';
import { createInitialState } from './state';

const gears = getUpgrade('biggerGears');

function withLevels(levels: Partial<Record<UpgradeId, number>>) {
  const state = createInitialState(0);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(gears, 0).toNumber()).toBe(25);
  });

  it('grows geometrically', () => {
    expect(costOf(gears, 1).toNumber()).toBeCloseTo(47.5, 6);
    expect(costOf(gears, 5).toNumber()).toBeCloseTo(25 * 1.9 ** 5, 6);
  });

  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let n = 3; n < 3 + 7; n++) sum += costOf(gears, n).toNumber();
    expect(bulkCost(gears, 3, 7).toNumber()).toBeCloseTo(sum, 6);
    expect(bulkCost(gears, 3, 0).toNumber()).toBe(0);
  });

  it('keeps the first upgrade inside one lap of the starting track', () => {
    // The whole point of bigger gears' base cost: affordable the moment lap one
    // lands, and it is the only upgrade on show until then.
    expect(costOf(gears, 0).lte(xpPerLap(createInitialState(0)))).toBe(true);
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
  it('is the metres of one lap', () => {
    // 30 m at 1 XP a metre.
    expect(xpPerLap(createInitialState(0)).toNumber()).toBe(30);
  });

  it('multiplies per xpMult level and ignores speed levels', () => {
    expect(xpPerLap(withLevels({ betterBike: 1 })).toNumber()).toBeCloseTo(45, 6);
    expect(xpPerLap(withLevels({ betterBike: 2 })).toNumber()).toBeCloseTo(67.5, 6);
    expect(xpPerLap(withLevels({ autoPedal: 9 })).toNumber()).toBe(30);
  });
});

describe('xpPerSecond', () => {
  it('is zero while nothing pedals by itself', () => {
    expect(xpPerSecond(createInitialState(0)).toNumber()).toBe(0);
    expect(xpPerSecond(withLevels({ betterBike: 2 })).toNumber()).toBe(0);
  });

  it('is laps per second times XP per lap', () => {
    // 0.5 m/s at 1 XP a metre.
    expect(xpPerSecond(withLevels({ autoPedal: 1 })).toNumber()).toBeCloseTo(0.5, 9);
    expect(xpPerSecond(withLevels({ autoPedal: 1, betterBike: 1 })).toNumber()).toBeCloseTo(
      0.75,
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

describe('metresPerTap', () => {
  it('starts at the base and grows one metre per gear level', () => {
    expect(metresPerTap(createInitialState(0))).toBe(BASE_TAP_METRES);
    expect(metresPerTap(withLevels({ biggerGears: 1 }))).toBe(2);
    expect(metresPerTap(withLevels({ biggerGears: 4 }))).toBe(5);
  });

  it('is untouched by the other upgrades', () => {
    expect(metresPerTap(withLevels({ autoPedal: 5, betterBike: 5, slipstream: 5 }))).toBe(
      BASE_TAP_METRES,
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
  it('adds taps a second, each worth a full metresPerTap', () => {
    // 0.5 taps a second at 1 m a tap.
    expect(autoSpeedMps(withLevels({ trainingPartner: 1 }))).toBeCloseTo(0.5, 9);
    // Gears make the partner's taps carry further too: 0.5 taps × 3 m.
    expect(autoSpeedMps(withLevels({ trainingPartner: 1, biggerGears: 2 }))).toBeCloseTo(1.5, 9);
    expect(autoSpeedMps(withLevels({ trainingPartner: 4, biggerGears: 2 }))).toBeCloseTo(6, 9);
  });

  it('stacks additively with auto-pedal before the multiplier applies', () => {
    // (0.5 auto-pedal + 0.5 taps × 2 m) × 1.2
    expect(
      autoSpeedMps(withLevels({ autoPedal: 1, trainingPartner: 1, biggerGears: 1, slipstream: 1 })),
    ).toBeCloseTo((0.5 + 1) * 1.2, 9);
  });

  it('feeds the XP readout like any other speed', () => {
    const state = withLevels({ trainingPartner: 2, biggerGears: 2 });
    // 1 tap/s × 3 m = 3 m/s at 1 XP a metre.
    expect(xpPerSecond(state).toNumber()).toBeCloseTo(3, 9);
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
