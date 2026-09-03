import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { TAP_METRES, buyUpgrade, canAfford, pedal } from './actions';
import { createInitialState } from './state';

function pedalTimes(state: ReturnType<typeof createInitialState>, times: number) {
  let current = state;
  for (let i = 0; i < times; i++) current = pedal(current);
  return current;
}

describe('pedal', () => {
  it('moves one metre and pays nothing until the lap is finished', () => {
    const before = createInitialState(0);
    const after = pedal(before);
    expect(after.lapProgressM).toBe(TAP_METRES);
    expect(after.totalTapsM).toBe(TAP_METRES);
    expect(after.money.toNumber()).toBe(0);
    expect(after.totalLaps).toBe(0);
    // Input is untouched.
    expect(before.lapProgressM).toBe(0);
    expect(before.totalTapsM).toBe(0);
  });

  it('pays out on the thirtieth tap and starts the next lap at zero', () => {
    const short = pedalTimes(createInitialState(0), 29);
    expect(short.money.toNumber()).toBe(0);
    expect(short.lapProgressM).toBe(29);

    const lap = pedal(short);
    expect(lap.money.toNumber()).toBe(5);
    expect(lap.totalLaps).toBe(1);
    expect(lap.lapProgressM).toBe(0);
    expect(lap.totalTapsM).toBe(30);
  });

  it('pays the upgraded rate once payout upgrades are owned', () => {
    const state = createInitialState(0);
    const geared = { ...state, upgrades: { ...state.upgrades, betterBike: 1 } };
    expect(pedalTimes(geared, 30).money.toNumber()).toBeCloseTo(7.5, 6);
  });
});

describe('buyUpgrade', () => {
  it('is a no-op when unaffordable', () => {
    const state = { ...createInitialState(0), money: new Decimal(9) };
    expect(canAfford(state, 'autoPedal')).toBe(false);
    expect(buyUpgrade(state, 'autoPedal')).toBe(state);
  });

  it('deducts the cost and raises the level', () => {
    const state = { ...createInitialState(0), money: new Decimal(25) };
    const one = buyUpgrade(state, 'autoPedal');
    expect(one.upgrades.autoPedal).toBe(1);
    expect(one.money.toNumber()).toBe(15);

    const two = buyUpgrade(one, 'autoPedal');
    expect(two.upgrades.autoPedal).toBe(2);
    expect(two.money.toNumber()).toBeCloseTo(3.5, 6);
    expect(canAfford(two, 'autoPedal')).toBe(false);
  });

  it('buys in bulk for the geometric total', () => {
    const state = { ...createInitialState(0), money: new Decimal(1000) };
    const bought = buyUpgrade(state, 'autoPedal', 5);
    expect(bought.upgrades.autoPedal).toBe(5);
    expect(bought.money.toNumber()).toBeCloseTo(1000 - (10 * (1.15 ** 5 - 1)) / 0.15, 6);
  });

  it('leaves the other upgrade alone', () => {
    const state = { ...createInitialState(0), money: new Decimal(100) };
    expect(buyUpgrade(state, 'betterBike').upgrades.autoPedal).toBe(0);
  });
});

describe('pacing', () => {
  it('reaches the first auto-pedal within 30 seconds of tapping at 4 taps a second', () => {
    let state = createInitialState(0);
    let taps = 0;
    while (!canAfford(state, 'autoPedal') && taps < 1000) {
      state = pedal(state);
      taps++;
    }
    expect(taps).toBeLessThanOrEqual(30 * 4);
  });
});
