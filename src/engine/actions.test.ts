import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { buyUpgrade, canAfford } from './actions';
import { createInitialState } from './state';
import { tick } from './tick';

describe('buyUpgrade', () => {
  it('is a no-op when unaffordable', () => {
    const state = { ...createInitialState(0), xp: new Decimal(0.9) };
    expect(canAfford(state, 'throttle')).toBe(false);
    expect(buyUpgrade(state, 'throttle')).toBe(state);
  });

  it('deducts the cost and raises the level', () => {
    const state = { ...createInitialState(0), xp: new Decimal(4) };
    const one = buyUpgrade(state, 'throttle');
    expect(one.upgrades.throttle).toBe(1);
    expect(one.xp.toNumber()).toBe(3);

    const two = buyUpgrade(one, 'throttle');
    expect(two.upgrades.throttle).toBe(2);
    expect(two.xp.toNumber()).toBe(1);
    // Level three costs 3.
    expect(canAfford(two, 'throttle')).toBe(false);
  });

  it('buys in bulk for the summed total', () => {
    const state = { ...createInitialState(0), xp: new Decimal(1000) };
    const bought = buyUpgrade(state, 'throttle', 5);
    expect(bought.upgrades.throttle).toBe(5);
    // The first five rungs: 1 + 2 + 3 + 4 + 5.
    expect(bought.xp.toNumber()).toBe(1000 - 15);
  });

  it('leaves the other upgrades alone', () => {
    const state = { ...createInitialState(0), xp: new Decimal(10), totalLaps: 3 };
    const bought = buyUpgrade(state, 'racingTyres');
    expect(bought.upgrades.racingTyres).toBe(1);
    expect(bought.upgrades.throttle).toBe(0);
  });

  it('spends XP and never touches money', () => {
    const state = { ...createInitialState(0), xp: new Decimal(4) };
    expect(buyUpgrade(state, 'throttle').money.toNumber()).toBe(0);
  });

  it('refuses an upgrade still locked behind its lap count, however rich you are', () => {
    const rich = { ...createInitialState(0), xp: new Decimal(1e6) };
    expect(canAfford(rich, 'racingTyres')).toBe(false);
    expect(buyUpgrade(rich, 'racingTyres')).toBe(rich);
    expect(canAfford(rich, 'biggerEngine')).toBe(false);
    expect(canAfford(rich, 'slipstream')).toBe(false);
    // The throttle is out from the first lap, so it is never gated.
    expect(canAfford(rich, 'throttle')).toBe(true);

    // Three laps is all the tyres are waiting for.
    const driven = { ...rich, totalLaps: 3 };
    expect(canAfford(driven, 'racingTyres')).toBe(true);
    expect(buyUpgrade(driven, 'racingTyres').upgrades.racingTyres).toBe(1);
    // The rest are still behind their own gates.
    expect(canAfford(driven, 'biggerEngine')).toBe(false);
  });
});

describe('pacing', () => {
  it('reaches the throttle, the first upgrade, ten seconds in', () => {
    let state = createInitialState(0);
    let seconds = 0;
    while (!canAfford(state, 'throttle') && seconds < 600) {
      state = tick(state, 1);
      seconds++;
    }
    // One lap of the backyard loop at the kart's own speed, with no input at all.
    expect(seconds).toBe(10);
    expect(state.totalLaps).toBe(1);
  });
});
