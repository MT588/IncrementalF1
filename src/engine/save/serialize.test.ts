import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { deserialize, fromSave, serialize, toSave } from './serialize';

describe('save round trip', () => {
  it('preserves state including large Decimal money', () => {
    const state = {
      ...createInitialState(123),
      money: new Decimal('1.5e400'),
      totalLaps: 42,
      generators: { mechanic: 7 },
      lastTickAt: 456,
    };
    const back = deserialize(serialize(state, 789));
    expect(back).not.toBeNull();
    expect(back!.money.eq(state.money)).toBe(true);
    expect(back!.totalLaps).toBe(42);
    expect(back!.generators.mechanic).toBe(7);
    expect(back!.lastTickAt).toBe(456);
    expect(back!.createdAt).toBe(123);
  });

  it('writes the current version and timestamp', () => {
    const save = toSave(createInitialState(0), 999);
    expect(save.version).toBe(1);
    expect(save.savedAt).toBe(999);
    expect(save.state.money).toBe('0');
  });

  it('defaults missing generators to zero', () => {
    const save = toSave(createInitialState(0), 0);
    save.state.generators = {};
    expect(fromSave(save)?.generators.mechanic).toBe(0);
  });
});

describe('rejects bad saves', () => {
  it.each([
    ['garbage string', 'not json'],
    ['empty object', '{}'],
    ['wrong version', JSON.stringify({ version: 99, savedAt: 0, state: {} })],
    [
      'negative money',
      JSON.stringify({
        ...toSave(createInitialState(0), 0),
        state: { ...toSave(createInitialState(0), 0).state, money: '-5' },
      }),
    ],
    [
      'fractional generator',
      JSON.stringify({
        ...toSave(createInitialState(0), 0),
        state: { ...toSave(createInitialState(0), 0).state, generators: { mechanic: 1.5 } },
      }),
    ],
    [
      'NaN money',
      JSON.stringify({
        ...toSave(createInitialState(0), 0),
        state: { ...toSave(createInitialState(0), 0).state, money: 'abc' },
      }),
    ],
  ])('%s', (_name, raw) => {
    expect(deserialize(raw)).toBeNull();
  });
});
