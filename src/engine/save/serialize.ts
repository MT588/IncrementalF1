import Decimal from 'break_infinity.js';
import type { GameState } from '../types';
import { getTrack, isTrackId } from '../data/tracks';
import { UPGRADE_IDS } from '../data/upgrades';
import type { UpgradeId } from '../data/upgrades';
import { LATEST_SAVE_VERSION, migrate } from './migrate';

export const SAVE_VERSION = LATEST_SAVE_VERSION;

export interface SaveFileV2 {
  version: 2;
  savedAt: number;
  state: {
    money: string;
    trackId: string;
    lapProgressM: number;
    totalLaps: number;
    totalTapsM: number;
    upgrades: Partial<Record<UpgradeId, number>>;
    lastTickAt: number;
    createdAt: number;
  };
}

export function toSave(state: GameState, savedAt: number): SaveFileV2 {
  return {
    version: 2,
    savedAt,
    state: {
      money: state.money.toString(),
      trackId: state.trackId,
      lapProgressM: state.lapProgressM,
      totalLaps: state.totalLaps,
      totalTapsM: state.totalTapsM,
      upgrades: { ...state.upgrades },
      lastTickAt: state.lastTickAt,
      createdAt: state.createdAt,
    },
  };
}

export function serialize(state: GameState, savedAt: number): string {
  return JSON.stringify(toSave(state, savedAt));
}

/**
 * Parse a save, migrating older versions first. Returns null for anything that is
 * not a well-formed save of a known version, so callers never overwrite a good
 * save with garbage.
 */
export function fromSave(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  const migrated = migrate(raw);
  if (!migrated) return null;

  const s = migrated.state;
  if (!isRecord(s)) return null;
  if (typeof s.money !== 'string') return null;
  if (!isTrackId(s.trackId)) return null;
  if (!isFiniteNumber(s.lastTickAt) || !isFiniteNumber(s.createdAt)) return null;
  if (!isCount(s.totalLaps) || !isFiniteNumber(s.totalTapsM) || s.totalTapsM < 0) return null;
  if (!isFiniteNumber(s.lapProgressM) || s.lapProgressM < 0) return null;
  if (!isRecord(s.upgrades)) return null;

  const money = parseMoney(s.money);
  if (!money) return null;

  const upgrades = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) {
    const level = s.upgrades[id];
    if (level === undefined) {
      upgrades[id] = 0;
    } else if (isCount(level)) {
      upgrades[id] = level;
    } else {
      return null;
    }
  }

  return {
    money,
    trackId: s.trackId,
    // A shorter track (or a hand-edited save) must not leave the bike past the line.
    lapProgressM: s.lapProgressM % getTrack(s.trackId).lapDistanceM,
    totalLaps: s.totalLaps,
    totalTapsM: s.totalTapsM,
    upgrades,
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

/** break_infinity throws on unparseable input, and fromSave must never throw. */
function parseMoney(raw: string): Decimal | null {
  let money: Decimal;
  try {
    money = new Decimal(raw);
  } catch {
    return null;
  }
  return Number.isFinite(money.mantissa) && money.gte(0) ? money : null;
}

/** A non-negative whole number: lap counts and upgrade levels. */
function isCount(v: unknown): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= 0;
}
