import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import type { UpgradeId } from './data/upgrades';
import { MAX_CATCH_UP_SECONDS, addDistance, advanceTo, tick } from './tick';

function withLevels(levels: Partial<Record<UpgradeId, number>>, now = 0) {
  const state = createInitialState(now);
  return { ...state, upgrades: { ...state.upgrades, ...levels } };
}

describe('addDistance', () => {
  it('moves without paying when the lap is not finished', () => {
    const after = addDistance(createInitialState(0), 9);
    expect(after.lapProgressM).toBe(9);
    expect(after.totalLaps).toBe(0);
    expect(after.xp.toNumber()).toBe(0);
  });

  it('pays exactly one lap at the line', () => {
    const after = addDistance(createInitialState(0), 10);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBe(0);
    expect(after.xp.toNumber()).toBe(1);
  });

  it('pays every lap crossed and carries the remainder', () => {
    const after = addDistance(createInitialState(0), 25);
    expect(after.totalLaps).toBe(2);
    expect(after.lapProgressM).toBeCloseTo(5, 9);
    expect(after.xp.toNumber()).toBe(2);
  });

  it('counts from where the kart already was', () => {
    const started = addDistance(createInitialState(0), 8);
    const after = addDistance(started, 5);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBeCloseTo(3, 9);
  });

  it('is a no-op for zero or negative distance', () => {
    const state = createInitialState(0);
    expect(addDistance(state, 0)).toBe(state);
    expect(addDistance(state, -5)).toBe(state);
  });
});

describe('tick', () => {
  it('drives a lap in ten seconds with nothing bought at all', () => {
    // The kart moves from the first second: 1 m/s round a 10 m lap.
    const after = tick(createInitialState(0), 10);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBeCloseTo(0, 9);
    expect(after.xp.toNumber()).toBe(1);
  });

  it('covers speed x dt, and the throttle makes that further', () => {
    // 1.5 m/s for ten seconds: a lap and half of the next.
    const after = tick(withLevels({ throttle: 1 }), 10);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBeCloseTo(5, 9);
    expect(after.xp.toNumber()).toBe(1);
  });

  it('returns the same object when no time passes', () => {
    const state = createInitialState(0);
    expect(tick(state, 0)).toBe(state);
  });
});

describe('advanceTo', () => {
  it('simulates the elapsed gap and stamps lastTickAt', () => {
    // 121 s at 1 m/s = 121 m = twelve laps with a metre left over.
    const { state, simulatedSeconds } = advanceTo(createInitialState(1000), 122_000);
    expect(simulatedSeconds).toBe(121);
    expect(state.totalLaps).toBe(12);
    expect(state.xp.toNumber()).toBe(12);
    expect(state.lapProgressM).toBeCloseTo(1, 9);
    expect(state.lastTickAt).toBe(122_000);
  });

  it('caps offline catch-up at eight hours', () => {
    const dayLater = 24 * 60 * 60 * 1000;
    const { state, simulatedSeconds } = advanceTo(createInitialState(0), dayLater);
    expect(simulatedSeconds).toBe(MAX_CATCH_UP_SECONDS);
    // 8 h at 1 m/s = 28800 m = 2880 laps of 10 m, and a lap pays 1 XP with
    // nothing bought to multiply it.
    expect(state.totalLaps).toBe(2880);
    expect(state.xp.toNumber()).toBe(2880);
    // Money has no earner until races: driving must never produce any.
    expect(state.money.toNumber()).toBe(0);
    expect(state.lastTickAt).toBe(dayLater);
  });

  it('never simulates backwards', () => {
    const { state, simulatedSeconds } = advanceTo(withLevels({ throttle: 1 }, 5000), 1000);
    expect(simulatedSeconds).toBe(0);
    expect(state.xp.toNumber()).toBe(0);
    expect(state.totalLaps).toBe(0);
  });
});
