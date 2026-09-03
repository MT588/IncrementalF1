import { describe, expect, it } from 'vitest';
import { bulkCost, costOf, outputPerSecond } from './formulas';
import { getGenerator } from './data/generators';
import { createInitialState } from './state';

const mechanic = getGenerator('mechanic');

describe('cost curve', () => {
  it('starts at the base cost', () => {
    expect(costOf(mechanic, 0).toNumber()).toBe(10);
  });

  it('grows geometrically', () => {
    expect(costOf(mechanic, 1).toNumber()).toBeCloseTo(11, 6);
    expect(costOf(mechanic, 5).toNumber()).toBeCloseTo(10 * 1.1 ** 5, 6);
  });

  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let n = 3; n < 3 + 7; n++) sum += costOf(mechanic, n).toNumber();
    expect(bulkCost(mechanic, 3, 7).toNumber()).toBeCloseTo(sum, 6);
    expect(bulkCost(mechanic, 3, 0).toNumber()).toBe(0);
  });
});

describe('output', () => {
  it('is zero with nothing owned and scales linearly', () => {
    const state = createInitialState(0);
    expect(outputPerSecond(state).toNumber()).toBe(0);
    const withTwo = { ...state, generators: { ...state.generators, mechanic: 2 } };
    expect(outputPerSecond(withTwo).toNumber()).toBe(1);
  });
});
