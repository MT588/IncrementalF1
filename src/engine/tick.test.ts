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
    const after = addDistance(createInitialState(0), 29);
    expect(after.lapProgressM).toBe(29);
    expect(after.totalLaps).toBe(0);
    expect(after.xp.toNumber()).toBe(0);
  });

  it('pays exactly one lap at the line', () => {
    const after = addDistance(createInitialState(0), 30);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBe(0);
    expect(after.xp.toNumber()).toBe(1);
  });

  it('pays every lap crossed and carries the remainder', () => {
    const after = addDistance(createInitialState(0), 65);
    expect(after.totalLaps).toBe(2);
    expect(after.lapProgressM).toBeCloseTo(5, 9);
    expect(after.xp.toNumber()).toBe(2);
  });

  it('counts from where the bike already was', () => {
    const started = addDistance(createInitialState(0), 25);
    const after = addDistance(started, 10);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBeCloseTo(5, 9);
  });

  it('is a no-op for zero or negative distance', () => {
    const state = createInitialState(0);
    expect(addDistance(state, 0)).toBe(state);
    expect(addDistance(state, -5)).toBe(state);
  });
});

describe('tick', () => {
  it('does nothing without auto-pedal, however long the tick', () => {
    const idle = createInitialState(0);
    expect(tick(idle, 3600)).toBe(idle);
  });

  it('covers speed x dt and completes a lap a minute at level 1', () => {
    const after = tick(withLevels({ autoPedal: 1 }), 60);
    expect(after.totalLaps).toBe(1);
    expect(after.lapProgressM).toBeCloseTo(0, 9);
    expect(after.xp.toNumber()).toBe(1);
  });

  it('returns the same object when no time passes', () => {
    const busy = withLevels({ autoPedal: 1 });
    expect(tick(busy, 0)).toBe(busy);
  });
});

describe('advanceTo', () => {
  it('simulates the elapsed gap and stamps lastTickAt', () => {
    // 121 s at 0.5 m/s = 60.5 m = two laps with half a metre left over.
    const { state, simulatedSeconds } = advanceTo(withLevels({ autoPedal: 1 }, 1000), 122_000);
    expect(simulatedSeconds).toBe(121);
    expect(state.totalLaps).toBe(2);
    expect(state.xp.toNumber()).toBe(2);
    expect(state.lapProgressM).toBeCloseTo(0.5, 9);
    expect(state.lastTickAt).toBe(122_000);
  });

  it('caps offline catch-up at eight hours', () => {
    const dayLater = 24 * 60 * 60 * 1000;
    const { state, simulatedSeconds } = advanceTo(withLevels({ autoPedal: 1 }, 0), dayLater);
    expect(simulatedSeconds).toBe(MAX_CATCH_UP_SECONDS);
    // 8 h at 0.5 m/s = 14400 m = 480 laps of 30 m, and a lap pays 1 XP with
    // nothing bought to multiply it.
    expect(state.totalLaps).toBe(480);
    expect(state.xp.toNumber()).toBe(480);
    // Money has no earner until races: riding must never produce any.
    expect(state.money.toNumber()).toBe(0);
    expect(state.lastTickAt).toBe(dayLater);
  });

  it('never simulates backwards', () => {
    const { state, simulatedSeconds } = advanceTo(withLevels({ autoPedal: 1 }, 5000), 1000);
    expect(simulatedSeconds).toBe(0);
    expect(state.xp.toNumber()).toBe(0);
    expect(state.totalLaps).toBe(0);
  });
});
