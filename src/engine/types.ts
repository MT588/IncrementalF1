import type Decimal from 'break_infinity.js';
import type { TrackId } from './data/tracks';
import type { UpgradeId } from './data/upgrades';

/** Everything the simulation needs. Serialisable (see save/serialize.ts). Never holds derived values. */
export interface GameState {
  /** Money in euros. Only ever earned by completing a lap. */
  money: Decimal;
  /** The track currently being ridden. */
  trackId: TrackId;
  /** Metres into the current lap: 0 <= lapProgressM < track.lapDistanceM. */
  lapProgressM: number;
  /** Completed laps, lifetime. */
  totalLaps: number;
  /** Metres pedalled by hand, lifetime. */
  totalTapsM: number;
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
  /** Base euros paid for completing one lap, before payout upgrades. */
  payoutPerLap: number;
}

/** What one level of an upgrade does. Add a kind here and handle it in formulas.ts. */
export type UpgradeEffect =
  /** Adds metres per second of automatic pedalling. */
  | { kind: 'speed'; perLevel: number }
  /** Multiplies the money earned per completed lap. */
  | { kind: 'payout'; perLevel: number };

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  /** Cost of the first level, in euros. */
  baseCost: number;
  /** Multiplicative cost growth per level owned. */
  growth: number;
  effect: UpgradeEffect;
}
