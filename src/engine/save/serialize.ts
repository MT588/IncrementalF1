import Decimal from 'break_infinity.js';
import type { GameState } from '../types';
import { GENERATOR_IDS } from '../data/generators';
import type { GeneratorId } from '../data/generators';

export const SAVE_VERSION = 1;

export interface SaveFileV1 {
  version: 1;
  savedAt: number;
  state: {
    money: string;
    totalLaps: number;
    generators: Partial<Record<GeneratorId, number>>;
    lastTickAt: number;
    createdAt: number;
  };
}

export function toSave(state: GameState, savedAt: number): SaveFileV1 {
  return {
    version: SAVE_VERSION,
    savedAt,
    state: {
      money: state.money.toString(),
      totalLaps: state.totalLaps,
      generators: { ...state.generators },
      lastTickAt: state.lastTickAt,
      createdAt: state.createdAt,
    },
  };
}

export function serialize(state: GameState, savedAt: number): string {
  return JSON.stringify(toSave(state, savedAt));
}

/**
 * Parse a save. Returns null for anything that is not a well-formed save of a known version,
 * so callers never overwrite a good save with garbage.
 */
export function fromSave(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) return null;
  const s = raw.state;
  if (!isRecord(s)) return null;
  if (typeof s.money !== 'string') return null;
  if (!isFiniteNumber(s.totalLaps) || !isFiniteNumber(s.lastTickAt) || !isFiniteNumber(s.createdAt))
    return null;
  if (!isRecord(s.generators)) return null;

  const money = new Decimal(s.money);
  if (!Number.isFinite(money.mantissa) || money.lt(0)) return null;

  const generators = {} as Record<GeneratorId, number>;
  for (const id of GENERATOR_IDS) {
    const n = s.generators[id];
    if (n === undefined) {
      generators[id] = 0;
    } else if (isFiniteNumber(n) && Number.isInteger(n) && n >= 0) {
      generators[id] = n;
    } else {
      return null;
    }
  }

  return {
    money,
    totalLaps: s.totalLaps,
    generators,
    lastTickAt: s.lastTickAt,
    createdAt: s.createdAt,
  };
}

export function deserialize(json: string): GameState | null {
  try {
    return fromSave(JSON.parse(json));
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
