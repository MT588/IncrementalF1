import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { buyUpgrade, canAfford, pedal } from './actions';
import { BASE_TAP_METRES } from './formulas';
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
    expect(after.lapProgressM).toBe(BASE_TAP_METRES);
    expect(after.totalTapsM).toBe(BASE_TAP_METRES);
    expect(after.xp.toNumber()).toBe(0);
    expect(after.totalLaps).toBe(0);
    // Input is untouched.
    expect(before.lapProgressM).toBe(0);
    expect(before.totalTapsM).toBe(0);
  });

  it('pays out on the thirtieth tap and starts the next lap at zero', () => {
    const short = pedalTimes(createInitialState(0), 29);
    expect(short.xp.toNumber()).toBe(0);
    expect(short.lapProgressM).toBe(29);

    const lap = pedal(short);
    expect(lap.xp.toNumber()).toBe(30);
    expect(lap.totalLaps).toBe(1);
    expect(lap.lapProgressM).toBe(0);
    expect(lap.totalTapsM).toBe(30);
  });

  it('never earns money, which waits for races', () => {
    expect(pedalTimes(createInitialState(0), 60).money.toNumber()).toBe(0);
  });

  it('pays the upgraded rate once xpMult upgrades are owned', () => {
    const state = createInitialState(0);
    const tyres = { ...state, upgrades: { ...state.upgrades, betterBike: 1 } };
    expect(pedalTimes(tyres, 30).xp.toNumber()).toBeCloseTo(45, 6);
  });
});

describe('buyUpgrade', () => {
  it('is a no-op when unaffordable', () => {
    const state = { ...createInitialState(0), xp: new Decimal(24) };
    expect(canAfford(state, 'biggerGears')).toBe(false);
    expect(buyUpgrade(state, 'biggerGears')).toBe(state);
  });

  it('deducts the cost and raises the level', () => {
    const state = { ...createInitialState(0), xp: new Decimal(100) };
    const one = buyUpgrade(state, 'biggerGears');
    expect(one.upgrades.biggerGears).toBe(1);
    expect(one.xp.toNumber()).toBe(75);

    const two = buyUpgrade(one, 'biggerGears');
    expect(two.upgrades.biggerGears).toBe(2);
    expect(two.xp.toNumber()).toBeCloseTo(27.5, 6);
    // Level three costs 90.25.
    expect(canAfford(two, 'biggerGears')).toBe(false);
  });

  it('buys in bulk for the geometric total', () => {
    const state = { ...createInitialState(0), xp: new Decimal(1000) };
    const bought = buyUpgrade(state, 'biggerGears', 5);
    expect(bought.upgrades.biggerGears).toBe(5);
    expect(bought.xp.toNumber()).toBeCloseTo(1000 - (25 * (1.9 ** 5 - 1)) / 0.9, 6);
  });

  it('leaves the other upgrade alone', () => {
    const state = { ...createInitialState(0), xp: new Decimal(200), totalLaps: 3 };
    const bought = buyUpgrade(state, 'betterBike');
    expect(bought.upgrades.betterBike).toBe(1);
    expect(bought.upgrades.biggerGears).toBe(0);
  });

  it('spends XP and never touches money', () => {
    const state = { ...createInitialState(0), xp: new Decimal(100) };
    expect(buyUpgrade(state, 'biggerGears').money.toNumber()).toBe(0);
  });

  it('refuses an upgrade still locked behind its lap count, however rich you are', () => {
    const rich = { ...createInitialState(0), xp: new Decimal(1e6) };
    expect(canAfford(rich, 'autoPedal')).toBe(false);
    expect(buyUpgrade(rich, 'autoPedal')).toBe(rich);
    expect(canAfford(rich, 'trainingPartner')).toBe(false);

    // One lap is all auto-pedal is waiting for.
    const rode = { ...rich, totalLaps: 1 };
    expect(canAfford(rode, 'autoPedal')).toBe(true);
    expect(buyUpgrade(rode, 'autoPedal').upgrades.autoPedal).toBe(1);
    // The rest are still behind their own gates.
    expect(canAfford(rode, 'betterBike')).toBe(false);
  });
});

describe('pacing', () => {
  it('reaches bigger gears, the first upgrade, on the first completed lap', () => {
    let state = createInitialState(0);
    let taps = 0;
    while (!canAfford(state, 'biggerGears') && taps < 1000) {
      state = pedal(state);
      taps++;
    }
    // One lap of the backyard loop, which is ~8 seconds at 4 taps a second.
    expect(taps).toBe(30);
  });
});

describe('pedal with bigger gears', () => {
  it('carries further per tap and still only pays on the line', () => {
    const state = createInitialState(0);
    const geared = { ...state, upgrades: { ...state.upgrades, biggerGears: 2 } };

    const after = pedal(geared);
    expect(after.lapProgressM).toBe(3);
    expect(after.totalTapsM).toBe(3);
    expect(after.xp.toNumber()).toBe(0);

    // Ten taps of 3 m finish the 30 m lap exactly.
    const lap = pedalTimes(geared, 10);
    expect(lap.totalLaps).toBe(1);
    expect(lap.lapProgressM).toBe(0);
    expect(lap.xp.toNumber()).toBe(30);
  });
});
