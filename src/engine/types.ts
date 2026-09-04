import type Decimal from 'break_infinity.js';
import type { TrackId } from './data/tracks';
import type { UpgradeId } from './data/upgrades';

/** Everything the simulation needs. Serialisable (see save/serialize.ts). Never holds derived values. */
export interface GameState {
  /**
   * Experience, the currency every upgrade is bought with. Earned only by
   * completing a lap, and the amount is derived from the metres of that lap.
   *
   * Carries fractions — a multiplied lap can pay 337.5 — but never shows them:
   * see util/formatNumber, which rounds every amount on its way to the screen.
   */
  xp: Decimal;
  /**
   * Prize money. Reserved for race payouts (M3): nothing earns it yet and no
   * UI shows it, so it is always zero for now.
   */
  money: Decimal;
  /** The track currently being driven. */
  trackId: TrackId;
  /** Metres into the current lap: 0 <= lapProgressM < track.lapDistanceM. */
  lapProgressM: number;
  /** Completed laps, lifetime. */
  totalLaps: number;
  /** Owned level per upgrade. 0 means not bought. */
  upgrades: Record<UpgradeId, number>;
  /** ms since epoch of the last simulated instant. Drives offline catch-up. */
  lastTickAt: number;
  /** ms since epoch when this save was started. */
  createdAt: number;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  description: string;
  /** One lap of this track, in metres. */
  lapDistanceM: number;
  /**
   * XP earned per metre driven here, before xpMult upgrades. A lap therefore
   * pays `lapDistanceM × xpPerMetre`, so longer tracks pay more per lap.
   * Note that XP *per second* does not depend on lap distance (it cancels),
   * so a later track only feels like a promotion if this number goes up.
   *
   * Pick it so the base lap payout lands on a whole number: `xpPerLap` rounds
   * to one, because the shed's prices are set against it.
   */
  xpPerMetre: number;
}

/** What one level of an upgrade does. Add a kind here and handle it in formulas.ts. */
export type UpgradeEffect =
  /** Adds metres per second to the kart's speed. */
  | { kind: 'speed'; perLevel: number }
  /** Multiplies the XP earned per completed lap. */
  | { kind: 'xpMult'; perLevel: number }
  /** Multiplies the whole speed, however that speed was earned. */
  | { kind: 'speedMult'; perLevel: number };

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  /** Cost of the first level, in XP. */
  baseCost: number;
  /** Multiplicative cost growth per level owned. */
  growth: number;
  /**
   * Completed laps needed before this appears in the shed at all. 0 means it is
   * there from the first lap. Gating on laps rather than XP keeps the reveal
   * tied to something that happened on track, not to a balance they happen to hold.
   */
  unlockAtLaps: number;
  effect: UpgradeEffect;
}
