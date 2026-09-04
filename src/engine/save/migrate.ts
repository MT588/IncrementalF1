import { STARTING_TRACK_ID } from '../data/tracks';
import { parseAmount } from './amount';

export const LATEST_SAVE_VERSION = 3;

type RawSave = Record<string, unknown>;
/** Returns the save one version newer, or null when it is too broken to convert. */
type Migration = (raw: RawSave) => RawSave | null;

/**
 * v1 was the M0 prototype: money per click plus `generators.mechanic`.
 * M1 replaced that loop wholesale — money and lap count carry over, and the
 * mechanics are dropped because there is nothing in v2 to convert them into.
 *
 * Frozen on purpose: it must keep writing a v2-shaped `money` field, because
 * migrateV2toV3 below is what turns that into XP. "Modernising" this to write
 * `xp` directly would leave that step with no money to read.
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

/**
 * v2 had a single currency, `money`, paid at 5 a lap. v3 splits the economy:
 * XP is earned from distance (30 a lap on the backyard loop) and buys the
 * upgrades, while money is reserved for race payouts and starts at zero.
 *
 * The old balance is converted at the lap-payout ratio, ×6, so it is worth the
 * same number of laps as before. Upgrade costs were rescaled by the same ×6
 * apart from auto-pedal, which is cheaper now — so a migrated save comes out
 * slightly ahead on that one rung.
 *
 * Parsing goes through `parseAmount` rather than `new Decimal` because this
 * runs before any of `fromSave`'s field validation, and an unparseable value
 * has to fail as a null return rather than a thrown error.
 */
const migrateV2toV3: Migration = (raw) => {
  if (!isRecord(raw.state)) return null;
  const old = raw.state;
  const money = parseAmount(old.money);
  if (!money) return null;
  return {
    ...raw,
    version: 3,
    state: { ...old, xp: money.mul(6).toString(), money: '0' },
  };
};

const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
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
