import { STARTING_TRACK_ID } from '../data/tracks';
import { parseAmount } from './amount';

export const LATEST_SAVE_VERSION = 6;

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

/**
 * v3 paid 30 XP a lap on the backyard loop; v4 pays 1, with every price in the
 * shed divided by the same 30 so nothing changes in laps. An old balance is
 * converted at that ratio and is worth exactly the laps it was worth before.
 */
const migrateV3toV4: Migration = (raw) => {
  if (!isRecord(raw.state)) return null;
  const old = raw.state;
  const xp = parseAmount(old.xp);
  if (!xp) return null;
  return { ...raw, version: 4, state: { ...old, xp: xp.div(30).toString() } };
};

/**
 * v4 called the manual action a tap; v5 calls it a click, and the lifetime
 * counter of self-pedalled metres was renamed with it. Nothing but the name
 * changes, so an absent old field is left absent.
 *
 * That used to make `fromSave` refuse such a save. It no longer does: v6 drops
 * the counter altogether, so there is nothing left to be missing.
 */
const migrateV4toV5: Migration = (raw) => {
  if (!isRecord(raw.state)) return null;
  const { totalTapsM, ...rest } = raw.state;
  return { ...raw, version: 5, state: { ...rest, totalClicksM: totalTapsM } };
};

/** Old id to new, for the upgrades that survived the move to a kart. */
const RENAMED_UPGRADES: readonly (readonly [string, string])[] = [
  ['autoPedal', 'throttle'],
  ['betterBike', 'racingTyres'],
  ['slipstream', 'slipstream'],
];

/**
 * v5 was the last of the bicycle: clicks for distance, five upgrades built round
 * them. v6 is a kart that drives itself, so the click is gone along with the two
 * upgrades that existed to make one worth pressing.
 *
 * Levels carry across one for one wherever the new ladder has an equivalent —
 * auto-pedal was the bike's first speed upgrade and the throttle is the kart's,
 * the tyres kept their name, and slipstream never changed. Bigger gears and the
 * training partner have nothing to convert into and are dropped, as v1's
 * mechanics were. `totalClicksM` goes with them: nothing clicks any more.
 */
const migrateV5toV6: Migration = (raw) => {
  if (!isRecord(raw.state)) return null;
  const owned = isRecord(raw.state.upgrades) ? raw.state.upgrades : {};
  const upgrades: RawSave = {};
  for (const [was, now] of RENAMED_UPGRADES) {
    if (owned[was] !== undefined) upgrades[now] = owned[was];
  }
  const state: RawSave = { ...raw.state, upgrades };
  // Nothing clicks any more, so the lifetime counter of clicked metres goes.
  delete state.totalClicksM;
  return { ...raw, version: 6, state };
};

const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
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
