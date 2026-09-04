import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { buyUpgrade, canAfford, click } from './actions';
import { BASE_CLICK_METRES } from './formulas';
import { createInitialState } from './state';

function clickTimes(state: ReturnType<typeof createInitialState>, times: number) {
  let current = state;
  for (let i = 0; i < times; i++) current = click(current);
  return current;
}

describe('click', () => {
  it('moves one metre and pays nothing until the lap is finished', () => {
    const before = createInitialState(0);
    const after = click(before);
    expect(after.lapProgressM).toBe(BASE_CLICK_METRES);
    expect(after.totalClicksM).toBe(BASE_CLICK_METRES);
    expect(after.xp.toNumber()).toBe(0);
    expect(after.totalLaps).toBe(0);
    // Input is untouched.
    expect(before.lapProgressM).toBe(0);
    expect(before.totalClicksM).toBe(0);
  });

  it('pays out on the thirtieth click and starts the next lap at zero', () => {
    const short = clickTimes(createInitialState(0), 29);
    expect(short.xp.toNumber()).toBe(0);
    expect(short.lapProgressM).toBe(29);

    const lap = click(short);
    expect(lap.xp.toNumber()).toBe(1);
    expect(lap.totalLaps).toBe(1);
    expect(lap.lapProgressM).toBe(0);
    expect(lap.totalClicksM).toBe(30);
  });

  it('never earns money, which waits for races', () => {
    expect(clickTimes(createInitialState(0), 60).money.toNumber()).toBe(0);
  });

  it('pays the upgraded rate once xpMult upgrades are owned', () => {
    const state = createInitialState(0);
    const tyres = { ...state, upgrades: { ...state.upgrades, betterBike: 1 } };
    // A whole 2 XP: the payout is rounded up so the balance never carries a
    // fraction the player is never shown.
    expect(clickTimes(tyres, 30).xp.toNumber()).toBe(2);
  });
});

describe('buyUpgrade', () => {
  it('is a no-op when unaffordable', () => {
    const state = { ...createInitialState(0), xp: new Decimal(0.9) };
    expect(canAfford(state, 'biggerGears')).toBe(false);
    expect(buyUpgrade(state, 'biggerGears')).toBe(state);
  });

  it('deducts the cost and raises the level', () => {
    const state = { ...createInitialState(0), xp: new Decimal(4) };
    const one = buyUpgrade(state, 'biggerGears');
    expect(one.upgrades.biggerGears).toBe(1);
    expect(one.xp.toNumber()).toBe(3);

    const two = buyUpgrade(one, 'biggerGears');
    expect(two.upgrades.biggerGears).toBe(2);
    expect(two.xp.toNumber()).toBe(1);
    // Level three costs 4.
    expect(canAfford(two, 'biggerGears')).toBe(false);
  });

  it('buys in bulk for the geometric total', () => {
    const state = { ...createInitialState(0), xp: new Decimal(1000) };
    const bought = buyUpgrade(state, 'biggerGears', 5);
    expect(bought.upgrades.biggerGears).toBe(5);
    // The first five rungs: 1 + 2 + 4 + 7 + 13.
    expect(bought.xp.toNumber()).toBe(1000 - 27);
  });

  it('leaves the other upgrade alone', () => {
    const state = { ...createInitialState(0), xp: new Decimal(10), totalLaps: 3 };
    const bought = buyUpgrade(state, 'betterBike');
    expect(bought.upgrades.betterBike).toBe(1);
    expect(bought.upgrades.biggerGears).toBe(0);
  });

  it('spends XP and never touches money', () => {
    const state = { ...createInitialState(0), xp: new Decimal(4) };
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
    let clicks = 0;
    while (!canAfford(state, 'biggerGears') && clicks < 1000) {
      state = click(state);
      clicks++;
    }
    // One lap of the backyard loop, which is ~8 seconds at 4 clicks a second.
    expect(clicks).toBe(30);
  });
});

describe('click with bigger gears', () => {
  it('carries further per click and still only pays on the line', () => {
    const state = createInitialState(0);
    const geared = { ...state, upgrades: { ...state.upgrades, biggerGears: 2 } };

    const after = click(geared);
    expect(after.lapProgressM).toBe(3);
    expect(after.totalClicksM).toBe(3);
    expect(after.xp.toNumber()).toBe(0);

    // Ten clicks of 3 m finish the 30 m lap exactly.
    const lap = clickTimes(geared, 10);
    expect(lap.totalLaps).toBe(1);
    expect(lap.lapProgressM).toBe(0);
    expect(lap.xp.toNumber()).toBe(1);
  });
});
