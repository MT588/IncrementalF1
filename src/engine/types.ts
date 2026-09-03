import type Decimal from 'break_infinity.js';
import type { GeneratorId } from './data/generators';

/** Everything the simulation needs. Serialisable (see save/serialize.ts). Never holds derived values. */
export interface GameState {
  /** Prize money in euros. */
  money: Decimal;
  /** Laps driven by hand, lifetime. */
  totalLaps: number;
  /** Owned count per generator. */
  generators: Record<GeneratorId, number>;
  /** ms since epoch of the last simulated instant. Drives offline catch-up. */
  lastTickAt: number;
  /** ms since epoch when this save was started. */
  createdAt: number;
}

export interface GeneratorDef {
  id: GeneratorId;
  name: string;
  description: string;
  /** Cost of the first unit, in euros. */
  baseCost: number;
  /** Multiplicative cost growth per unit owned. */
  growth: number;
  /** Euros per second produced by one unit. */
  baseOutput: number;
}
