import Decimal from 'break_infinity.js';
import type { GameState } from '../types';
import { getTrack, isTrackId } from '../data/tracks';
import { UPGRADE_IDS } from '../data/upgrades';
import type { UpgradeId } from '../data/upgrades';
import { parseAmount } from './amount';
import { LATEST_SAVE_VERSION, migrate } from './migrate';

export const SAVE_VERSION = LATEST_SAVE_VERSION;

export interface SaveFileV5 {
  version: 5;
  savedAt: number;
  state: {
    xp: string;
    money: string;
    trackId: string;
    lapProgressM: number;
    totalLaps: number;
    totalClicksM: number;
    upgrades: Partial<Record<UpgradeId, number>>;
    lastTickAt: number;
    createdAt: number;
  };
}

export function toSave(state: GameState, savedAt: number): SaveFileV5 {
  return {
    // Keep in step with LATEST_SAVE_VERSION and the interface above.
    version: 5,
    savedAt,
    state: {
      xp: state.xp.toString(),
      money: state.money.toString(),
      trackId: state.trackId,
      lapProgressM: state.lapProgressM,
      totalLaps: state.totalLaps,
      totalClicksM: state.totalClicksM,
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
 * save with garbage. Never throws: every Decimal comes from `parseAmount`.
 */
export function fromSave(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  const migrated = migrate(raw);
  if (!migrated) return null;

  const s = migrated.state;
  if (!isRecord(s)) return null;
  if (!isTrackId(s.trackId)) return null;
  if (!isFiniteNumber(s.lastTickAt) || !isFiniteNumber(s.createdAt)) return null;
  if (!isCount(s.totalLaps) || !isFiniteNumber(s.totalClicksM) || s.totalClicksM < 0) return null;
  if (!isFiniteNumber(s.lapProgressM) || s.lapProgressM < 0) return null;
  if (!isRecord(s.upgrades)) return null;

  const xp = parseAmount(s.xp);
  if (!xp) return null;
  // Money has no earner yet, so an absent field is normal rather than corrupt —
  // same tolerance as a missing upgrade level. A malformed one is still refused.
  const money = s.money === undefined ? new Decimal(0) : parseAmount(s.money);
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
    xp,
    money,
    trackId: s.trackId,
    // A shorter track (or a hand-edited save) must not leave the bike past the line.
    lapProgressM: s.lapProgressM % getTrack(s.trackId).lapDistanceM,
    totalLaps: s.totalLaps,
    totalClicksM: s.totalClicksM,
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

/** A non-negative whole number: lap counts and upgrade levels. */
function isCount(v: unknown): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= 0;
}
