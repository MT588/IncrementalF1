import { describe, expect, it } from 'vitest';
import { autoSpeedMps, bulkCost, costOf, moneyPerLap, outputPerSecond } from './formulas';
import { getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';
import { createInitialState } from './state';

const autoPedal = getUpgrade('autoPedal');

function withLevels(levels: Partial<Record<UpgradeId, number>>) {
  const state = createInitialState(0);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(autoPedal, 0).toNumber()).toBe(10);
  });

  it('grows geometrically', () => {
    expect(costOf(autoPedal, 1).toNumber()).toBeCloseTo(11.5, 6);
    expect(costOf(autoPedal, 5).toNumber()).toBeCloseTo(10 * 1.15 ** 5, 6);
  });

  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let n = 3; n < 3 + 7; n++) sum += costOf(autoPedal, n).toNumber();
    expect(bulkCost(autoPedal, 3, 7).toNumber()).toBeCloseTo(sum, 6);
    expect(bulkCost(autoPedal, 3, 0).toNumber()).toBe(0);
  });
});

describe('autoSpeedMps', () => {
  it('is zero until auto-pedal is bought, then stacks per level', () => {
    expect(autoSpeedMps(createInitialState(0))).toBe(0);
    expect(autoSpeedMps(withLevels({ autoPedal: 1 }))).toBe(0.5);
    expect(autoSpeedMps(withLevels({ autoPedal: 4 }))).toBe(2);
  });

  it('ignores payout upgrades', () => {
    expect(autoSpeedMps(withLevels({ betterBike: 3 }))).toBe(0);
  });
});

describe('moneyPerLap', () => {
  it('starts at the track payout', () => {
    expect(moneyPerLap(createInitialState(0)).toNumber()).toBe(5);
  });

  it('multiplies per payout level and ignores speed levels', () => {
    expect(moneyPerLap(withLevels({ betterBike: 1 })).toNumber()).toBeCloseTo(7.5, 6);
    expect(moneyPerLap(withLevels({ betterBike: 2 })).toNumber()).toBeCloseTo(11.25, 6);
    expect(moneyPerLap(withLevels({ autoPedal: 9 })).toNumber()).toBe(5);
  });
});

describe('outputPerSecond', () => {
  it('is zero while nothing pedals by itself', () => {
    expect(outputPerSecond(createInitialState(0)).toNumber()).toBe(0);
    expect(outputPerSecond(withLevels({ betterBike: 2 })).toNumber()).toBe(0);
  });

  it('is laps per second times money per lap', () => {
    // 0.5 m/s round a 30 m lap = one lap a minute, at EUR 5 a lap.
    expect(outputPerSecond(withLevels({ autoPedal: 1 })).toNumber()).toBeCloseTo(5 / 60, 9);
    expect(outputPerSecond(withLevels({ autoPedal: 1, betterBike: 1 })).toNumber()).toBeCloseTo(
      7.5 / 60,
      9,
    );
  });
});
