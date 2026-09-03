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

describe('save round trip', () => {
  it('preserves state including large Decimal money', () => {
    const state = {
      ...createInitialState(123),
      money: new Decimal('1.5e400'),
      lapProgressM: 12.5,
      totalLaps: 42,
      totalTapsM: 900,
      upgrades: { autoPedal: 3, betterBike: 2 },
      lastTickAt: 456,
    };
    const back = deserialize(serialize(state, 789));
    expect(back).not.toBeNull();
    expect(back!.money.eq(state.money)).toBe(true);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(12.5);
    expect(back!.totalLaps).toBe(42);
    expect(back!.totalTapsM).toBe(900);
    expect(back!.upgrades.autoPedal).toBe(3);
    expect(back!.upgrades.betterBike).toBe(2);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.createdAt).toBe(123);
  });

  it('writes the current version and timestamp', () => {
    const save = toSave(createInitialState(0), 999);
    expect(save.version).toBe(2);
    expect(save.savedAt).toBe(999);
    expect(save.state.money).toBe('0');
  });

  it('defaults missing upgrades to zero', () => {
    const save = base();
    save.state.upgrades = {};
    expect(fromSave(save)?.upgrades.autoPedal).toBe(0);
  });

  it('never leaves the bike parked past the finish line', () => {
    const save = base();
    save.state.lapProgressM = 95;
    expect(fromSave(save)?.lapProgressM).toBeCloseTo(5, 9);
  });
});

describe('migration', () => {
  it('carries money and laps from a v1 save and drops the mechanics', () => {
    const back = fromSave(v1Save);
    expect(back).not.toBeNull();
    expect(back!.money.toNumber()).toBe(1234);
    expect(back!.totalLaps).toBe(17);
    expect(back!.createdAt).toBe(123);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.trackId).toBe('backyard');
    expect(back!.lapProgressM).toBe(0);
    expect(back!.upgrades.autoPedal).toBe(0);
    expect(back!.upgrades.betterBike).toBe(0);
  });

  it('refuses a v1 save that was already broken', () => {
    expect(fromSave({ ...v1Save, state: { ...v1Save.state, money: 'abc' } })).toBeNull();
    expect(fromSave({ version: 1, savedAt: 0 })).toBeNull();
  });
});

describe('rejects bad saves', () => {
  it.each([
    ['garbage string', 'not json'],
    ['empty object', '{}'],
    ['future version', JSON.stringify({ version: 99, savedAt: 0, state: {} })],
    ['unknown track', JSON.stringify({ ...base(), state: { ...base().state, trackId: 'monza' } })],
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
