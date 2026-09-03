import { STARTING_TRACK_ID } from '../data/tracks';

export const LATEST_SAVE_VERSION = 2;

type RawSave = Record<string, unknown>;
/** Returns the save one version newer, or null when it is too broken to convert. */
type Migration = (raw: RawSave) => RawSave | null;

/**
 * v1 was the M0 prototype: money per click plus `generators.mechanic`.
 * M1 replaced that loop wholesale — money and lap count carry over, and the
 * mechanics are dropped because there is nothing in v2 to convert them into.
 */
const migrateV1toV2: Migration = (raw) => {
  if (!isRecord(raw.state)) return null;
  const old = raw.state;
  return {
    ...raw,
    version: 2,
    state: {
      money: old.money,
      trackId: STARTING_TRACK_ID,
      lapProgressM: 0,
      totalLaps: old.totalLaps,
      totalTapsM: 0,
      upgrades: {},
      lastTickAt: old.lastTickAt,
      createdAt: old.createdAt,
    },
  };
};

const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
};

/**
 * Run migrations in sequence until the save is at LATEST_SAVE_VERSION.
 * Returns null for an unknown, future, or unmigratable version — callers then
 * refuse the save rather than loading half of it.
 */
export function migrate(raw: RawSave): RawSave | null {
  let current = raw;
  for (let guard = 0; guard <= LATEST_SAVE_VERSION; guard++) {
    const version = current.version;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
    if (version === LATEST_SAVE_VERSION) return current;
    if (version > LATEST_SAVE_VERSION) return null;
    const step = MIGRATIONS[version];
    if (!step) return null;
    const next = step(current);
    if (!next) return null;
    current = next;
  }
  return null;
}

function isRecord(v: unknown): v is RawSave {
  return typeof v === 'object' && v !== null;
}
