import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { deserialize, fromSave, serialize, toSave } from './serialize';

const base = () => toSave(createInitialState(0), 0);

/** A save as M0 wrote them: money per click plus mechanic generators. */
const v1Save = {
  version: 1,
  savedAt: 555,
  state: {
    money: '1234',
    totalLaps: 17,
    generators: { mechanic: 6 },
    lastTickAt: 456,
    createdAt: 123,
  },
};

/** A save as M1 wrote them: one currency, `money`, paid at 5 a lap. */
const v2Save = {
  version: 2,
  savedAt: 555,
  state: {
    money: '100',
    trackId: 'backyard',
    lapProgressM: 12,
    totalLaps: 20,
    totalTapsM: 300,
    upgrades: { autoPedal: 3, betterBike: 1 },
    lastTickAt: 456,
    createdAt: 123,
  },
};

/** A save as M1.6 wrote them: XP paid at 30 a lap on the backyard loop. */
const v3Save = {
  version: 3,
  savedAt: 555,
  state: {
    xp: '600',
    money: '0',
    trackId: 'backyard',
    lapProgressM: 12,
    totalLaps: 20,
    totalTapsM: 300,
    upgrades: { autoPedal: 3, betterBike: 1 },
    lastTickAt: 456,
    createdAt: 123,
  },
};

/** A save as M1.6.6 wrote them: 1 XP a lap, and the manual action still a tap. */
const v4Save = {
  version: 4,
  savedAt: 555,
  state: {
    xp: '20',
    money: '0',
    trackId: 'backyard',
    lapProgressM: 12,
    totalLaps: 20,
    totalTapsM: 300,
    upgrades: { autoPedal: 3, betterBike: 1 },
    lastTickAt: 456,
    createdAt: 123,
  },
};

/** A save as M1.6.7 wrote them: the last of the bicycle, with all five upgrades. */
const v5Save = {
  version: 5,
  savedAt: 555,
  state: {
    xp: '20',
    money: '0',
    trackId: 'backyard',
    lapProgressM: 12,
    totalLaps: 20,
    totalClicksM: 300,
    upgrades: { biggerGears: 4, autoPedal: 3, betterBike: 1, slipstream: 2, trainingPartner: 5 },
    lastTickAt: 456,
    createdAt: 123,
  },
};

describe('save round trip', () => {
  it('preserves state including large Decimal XP', () => {
    const initial = createInitialState(123);
    const state = {
      ...initial,
      xp: new Decimal('1.5e400'),
      lapProgressM: 2.5,
      totalLaps: 42,
      // Spread the initial levels so adding an upgrade does not break this fixture.
      upgrades: { ...initial.upgrades, throttle: 3, racingTyres: 2, slipstream: 1 },
      lastTickAt: 456,
    };
    const back = deserialize(serialize(state, 789));
    expect(back).not.toBeNull();
    expect(back!.xp.eq(state.xp)).toBe(true);
    expect(back!.money.toNumber()).toBe(0);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(2.5);
    expect(back!.totalLaps).toBe(42);
    expect(back!.upgrades.throttle).toBe(3);
    expect(back!.upgrades.racingTyres).toBe(2);
    expect(back!.upgrades.slipstream).toBe(1);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.createdAt).toBe(123);
  });

  it('writes the current version and timestamp', () => {
    const save = toSave(createInitialState(0), 999);
    expect(save.version).toBe(6);
    expect(save.savedAt).toBe(999);
    expect(save.state.xp).toBe('0');
    expect(save.state.money).toBe('0');
  });

  it('defaults missing upgrades to zero', () => {
    const save = base();
    save.state.upgrades = {};
    expect(fromSave(save)?.upgrades.throttle).toBe(0);
  });

  it('takes a save written before race craft existed', () => {
    // A new upgrade needs no migration: the save shape did not change, and an
    // absent level is already read as nought.
    const save = base();
    save.state.upgrades = { throttle: 4, racingTyres: 2 };
    const back = fromSave(save);
    expect(back).not.toBeNull();
    expect(back!.upgrades.raceCraft).toBe(0);
    expect(back!.upgrades.throttle).toBe(4);
    // Still version 6: nothing stored needed converting.
    expect(toSave(back!, 0).version).toBe(6);
  });

  it('tolerates a missing money field, which has no earner yet', () => {
    const save = base();
    delete (save.state as Partial<typeof save.state>).money;
    const back = fromSave(save);
    expect(back).not.toBeNull();
    expect(back!.money.toNumber()).toBe(0);
  });

  it('never leaves the kart parked past the finish line', () => {
    const save = base();
    save.state.lapProgressM = 95;
    expect(fromSave(save)?.lapProgressM).toBeCloseTo(5, 9);
  });
});

describe('migration', () => {
  it('converts a v2 money balance into XP at the lap-payout ratio', () => {
    const back = fromSave(v2Save);
    expect(back).not.toBeNull();
    // The old economy paid 5 a lap, the current one pays 1: the same 20 laps of
    // buying power, whatever the scale in between.
    expect(back!.xp.toNumber()).toBe(20);
    expect(back!.money.toNumber()).toBe(0);
    // Everything else rides along untouched, bar the lap the kart is part-way
    // round: 12 m into a lap that is now only 10 m long is 2 m into the next.
    expect(back!.totalLaps).toBe(20);
    expect(back!.lapProgressM).toBeCloseTo(2, 9);
    expect(back!.upgrades.throttle).toBe(3);
    expect(back!.upgrades.racingTyres).toBe(1);
    expect(back!.upgrades.slipstream).toBe(0);
  });

  it('rescales a v3 XP balance to the laps it was worth', () => {
    const back = fromSave(v3Save);
    expect(back).not.toBeNull();
    // 600 XP at 30 a lap was 20 laps of buying power; so is 20 XP at 1 a lap.
    expect(back!.xp.toNumber()).toBe(20);
    expect(back!.totalLaps).toBe(20);
    expect(back!.upgrades.throttle).toBe(3);
  });

  it('carries a v4 save through the tap rename and out the far side', () => {
    const back = fromSave(v4Save);
    expect(back).not.toBeNull();
    expect(back!.xp.toNumber()).toBe(20);
    expect(back!.upgrades.throttle).toBe(3);
    // The tap counter it was renamed into no longer exists in the state at all,
    // so a v4 save without one is now perfectly loadable.
    const noCounter = fromSave({ ...v4Save, state: { ...v4Save.state, totalTapsM: undefined } });
    expect(noCounter).not.toBeNull();
    expect(noCounter!.totalLaps).toBe(20);
  });

  it('maps the bicycle upgrades onto the kart, and drops the rest', () => {
    const back = fromSave(v5Save);
    expect(back).not.toBeNull();
    // Auto-pedal was the bike's first speed upgrade and the throttle is the
    // kart's, so the level carries over.
    expect(back!.upgrades.throttle).toBe(3);
    expect(back!.upgrades.racingTyres).toBe(1);
    expect(back!.upgrades.slipstream).toBe(2);
    // Bigger gears and the training partner made a click worth more; nothing
    // clicks any more, so they have nothing to become.
    expect(back!.upgrades.biggerEngine).toBe(0);
    expect(Object.keys(back!.upgrades).sort()).toEqual([
      'biggerEngine',
      'raceCraft',
      'racingTyres',
      'slipstream',
      'throttle',
    ]);
    // The balance and the laps are untouched by the move.
    expect(back!.xp.toNumber()).toBe(20);
    expect(back!.totalLaps).toBe(20);
    expect(back!.lapProgressM).toBeCloseTo(2, 9);
  });

  it('carries money and laps from a v1 save through every step', () => {
    const back = fromSave(v1Save);
    expect(back).not.toBeNull();
    // v1 money 1234 becomes v2 money 1234, then v3 XP 7404, then v4 XP 246.8.
    expect(back!.xp.toNumber()).toBeCloseTo(246.8, 9);
    expect(back!.money.toNumber()).toBe(0);
    expect(back!.totalLaps).toBe(17);
    expect(back!.createdAt).toBe(123);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(0);
    expect(back!.upgrades.throttle).toBe(0);
    expect(back!.upgrades.racingTyres).toBe(0);
  });

  it('refuses a broken older save without throwing', () => {
    // The v2 -> v3 step multiplies the balance, so it has to parse it first:
    // break_infinity throws on 'abc', and fromSave must still only return null.
    expect(() => fromSave({ ...v1Save, state: { ...v1Save.state, money: 'abc' } })).not.toThrow();
    expect(fromSave({ ...v1Save, state: { ...v1Save.state, money: 'abc' } })).toBeNull();
    expect(fromSave({ ...v2Save, state: { ...v2Save.state, money: 'abc' } })).toBeNull();
    // A missing balance must be refused rather than silently becoming zero.
    expect(fromSave({ ...v2Save, state: { ...v2Save.state, money: undefined } })).toBeNull();
    // Same for the v3 -> v4 step, which divides the XP balance.
    expect(fromSave({ ...v3Save, state: { ...v3Save.state, xp: 'abc' } })).toBeNull();
    expect(fromSave({ version: 1, savedAt: 0 })).toBeNull();
  });
});

describe('rejects bad saves', () => {
  it.each([
    ['garbage string', 'not json'],
    ['empty object', '{}'],
    ['future version', JSON.stringify({ version: 99, savedAt: 0, state: {} })],
    ['unknown track', JSON.stringify({ ...base(), state: { ...base().state, trackId: 'monza' } })],
    ['negative xp', JSON.stringify({ ...base(), state: { ...base().state, xp: '-5' } })],
    ['NaN xp', JSON.stringify({ ...base(), state: { ...base().state, xp: 'abc' } })],
    ['missing xp', JSON.stringify({ ...base(), state: { ...base().state, xp: undefined } })],
    ['negative money', JSON.stringify({ ...base(), state: { ...base().state, money: '-5' } })],
    ['NaN money', JSON.stringify({ ...base(), state: { ...base().state, money: 'abc' } })],
    [
      'fractional upgrade level',
      JSON.stringify({ ...base(), state: { ...base().state, upgrades: { throttle: 1.5 } } }),
    ],
    [
      'negative lap progress',
      JSON.stringify({ ...base(), state: { ...base().state, lapProgressM: -1 } }),
    ],
    [
      'fractional lap count',
      JSON.stringify({ ...base(), state: { ...base().state, totalLaps: 2.5 } }),
    ],
  ])('%s', (_name, raw) => {
    expect(deserialize(raw)).toBeNull();
  });
});
