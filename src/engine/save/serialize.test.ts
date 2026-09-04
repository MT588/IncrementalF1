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

describe('save round trip', () => {
  it('preserves state including large Decimal XP', () => {
    const initial = createInitialState(123);
    const state = {
      ...initial,
      xp: new Decimal('1.5e400'),
      lapProgressM: 12.5,
      totalLaps: 42,
      totalTapsM: 900,
      // Spread the initial levels so adding an upgrade does not break this fixture.
      upgrades: { ...initial.upgrades, autoPedal: 3, betterBike: 2, slipstream: 1 },
      lastTickAt: 456,
    };
    const back = deserialize(serialize(state, 789));
    expect(back).not.toBeNull();
    expect(back!.xp.eq(state.xp)).toBe(true);
    expect(back!.money.toNumber()).toBe(0);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(12.5);
    expect(back!.totalLaps).toBe(42);
    expect(back!.totalTapsM).toBe(900);
    expect(back!.upgrades.autoPedal).toBe(3);
    expect(back!.upgrades.betterBike).toBe(2);
    expect(back!.upgrades.slipstream).toBe(1);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.createdAt).toBe(123);
  });

  it('writes the current version and timestamp', () => {
    const save = toSave(createInitialState(0), 999);
    expect(save.version).toBe(3);
    expect(save.savedAt).toBe(999);
    expect(save.state.xp).toBe('0');
    expect(save.state.money).toBe('0');
  });

  it('defaults missing upgrades to zero', () => {
    const save = base();
    save.state.upgrades = {};
    expect(fromSave(save)?.upgrades.autoPedal).toBe(0);
  });

  it('tolerates a missing money field, which has no earner yet', () => {
    const save = base();
    delete (save.state as Partial<typeof save.state>).money;
    const back = fromSave(save);
    expect(back).not.toBeNull();
    expect(back!.money.toNumber()).toBe(0);
  });

  it('never leaves the bike parked past the finish line', () => {
    const save = base();
    save.state.lapProgressM = 95;
    expect(fromSave(save)?.lapProgressM).toBeCloseTo(5, 9);
  });
});

describe('migration', () => {
  it('converts a v2 money balance into XP at the lap-payout ratio', () => {
    const back = fromSave(v2Save);
    expect(back).not.toBeNull();
    // The old economy paid 5 a lap, the new one pays 30: the same 20 laps of
    // buying power.
    expect(back!.xp.toNumber()).toBe(600);
    expect(back!.money.toNumber()).toBe(0);
    // Everything else rides along untouched.
    expect(back!.totalLaps).toBe(20);
    expect(back!.totalTapsM).toBe(300);
    expect(back!.lapProgressM).toBe(12);
    expect(back!.upgrades.autoPedal).toBe(3);
    expect(back!.upgrades.betterBike).toBe(1);
    expect(back!.upgrades.slipstream).toBe(0);
  });

  it('carries money and laps from a v1 save through both steps', () => {
    const back = fromSave(v1Save);
    expect(back).not.toBeNull();
    // v1 money 1234 becomes v2 money 1234, then v3 XP 7404.
    expect(back!.xp.toNumber()).toBe(7404);
    expect(back!.money.toNumber()).toBe(0);
    expect(back!.totalLaps).toBe(17);
    expect(back!.createdAt).toBe(123);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(0);
    expect(back!.upgrades.autoPedal).toBe(0);
    expect(back!.upgrades.betterBike).toBe(0);
  });

  it('refuses a broken older save without throwing', () => {
    // The v2 -> v3 step multiplies the balance, so it has to parse it first:
    // break_infinity throws on 'abc', and fromSave must still only return null.
    expect(() => fromSave({ ...v1Save, state: { ...v1Save.state, money: 'abc' } })).not.toThrow();
    expect(fromSave({ ...v1Save, state: { ...v1Save.state, money: 'abc' } })).toBeNull();
    expect(fromSave({ ...v2Save, state: { ...v2Save.state, money: 'abc' } })).toBeNull();
    // A missing balance must be refused rather than silently becoming zero.
    expect(fromSave({ ...v2Save, state: { ...v2Save.state, money: undefined } })).toBeNull();
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
      JSON.stringify({ ...base(), state: { ...base().state, upgrades: { autoPedal: 1.5 } } }),
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
