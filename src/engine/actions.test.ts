import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { buyGenerator, canAfford, driveLap } from './actions';
import { createInitialState } from './state';

describe('driveLap', () => {
  it('adds one euro and one lap without mutating the input', () => {
    const before = createInitialState(0);
    const after = driveLap(before);
    expect(after.money.toNumber()).toBe(1);
    expect(after.totalLaps).toBe(1);
    expect(before.money.toNumber()).toBe(0);
    expect(before.totalLaps).toBe(0);
  });
});

describe('buyGenerator', () => {
  it('is a no-op when unaffordable', () => {
    const state = { ...createInitialState(0), money: new Decimal(9) };
    expect(canAfford(state, 'mechanic')).toBe(false);
    expect(buyGenerator(state, 'mechanic')).toBe(state);
  });

  it('deducts the cost and increments the count', () => {
    const state = { ...createInitialState(0), money: new Decimal(25) };
    const one = buyGenerator(state, 'mechanic');
    expect(one.generators.mechanic).toBe(1);
    expect(one.money.toNumber()).toBe(15);
    const two = buyGenerator(one, 'mechanic');
    expect(two.generators.mechanic).toBe(2);
    expect(two.money.toNumber()).toBeCloseTo(4, 6);
    expect(canAfford(two, 'mechanic')).toBe(false);
  });

  it('buys in bulk for the geometric total', () => {
    const state = { ...createInitialState(0), money: new Decimal(1000) };
    const bought = buyGenerator(state, 'mechanic', 5);
    expect(bought.generators.mechanic).toBe(5);
    expect(bought.money.toNumber()).toBeCloseTo(1000 - (10 * (1.1 ** 5 - 1)) / 0.1, 6);
  });
});
