import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { MAX_CATCH_UP_SECONDS, advanceTo, tick } from './tick';

function withMechanics(n: number, now = 0) {
  const state = createInitialState(now);
  return { ...state, generators: { ...state.generators, mechanic: n } };
}

describe('tick', () => {
  it('produces output × dt', () => {
    const after = tick(withMechanics(2), 10);
    expect(after.money.toNumber()).toBe(10);
  });

  it('returns the same object when nothing changes', () => {
    const idle = createInitialState(0);
    expect(tick(idle, 10)).toBe(idle);
    const busy = withMechanics(1);
    expect(tick(busy, 0)).toBe(busy);
  });
});

describe('advanceTo', () => {
  it('simulates the elapsed gap and stamps lastTickAt', () => {
    const { state, simulatedSeconds } = advanceTo(withMechanics(1, 1000), 6000);
    expect(simulatedSeconds).toBe(5);
    expect(state.money.toNumber()).toBe(2.5);
    expect(state.lastTickAt).toBe(6000);
  });

  it('caps offline catch-up at eight hours', () => {
    const dayLater = 24 * 60 * 60 * 1000;
    const { state, simulatedSeconds } = advanceTo(withMechanics(1, 0), dayLater);
    expect(simulatedSeconds).toBe(MAX_CATCH_UP_SECONDS);
    expect(state.money.toNumber()).toBe(0.5 * MAX_CATCH_UP_SECONDS);
    expect(state.lastTickAt).toBe(dayLater);
  });

  it('never simulates backwards', () => {
    const { state, simulatedSeconds } = advanceTo(withMechanics(1, 5000), 1000);
    expect(simulatedSeconds).toBe(0);
    expect(state.money.toNumber()).toBe(0);
  });
});
