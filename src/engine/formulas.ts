import Decimal from 'break_infinity.js';
import type { GameState, GeneratorDef } from './types';
import { GENERATORS } from './data/generators';

/** Cost of the next unit when `owned` units are already owned: baseCost × growth^owned. */
export function costOf(def: GeneratorDef, owned: number): Decimal {
  return new Decimal(def.baseCost).mul(Decimal.pow(def.growth, owned));
}

/**
 * Cost of buying `amount` units starting at `owned`. Geometric series:
 * baseCost × growth^owned × (growth^amount − 1) / (growth − 1).
 */
export function bulkCost(def: GeneratorDef, owned: number, amount: number): Decimal {
  if (amount <= 0) return new Decimal(0);
  if (def.growth === 1) return new Decimal(def.baseCost).mul(amount);
  const first = costOf(def, owned);
  const ratio = new Decimal(def.growth);
  return first.mul(ratio.pow(amount).sub(1)).div(ratio.sub(1));
}

/** Euros per second produced by one generator type at the given count. */
export function generatorOutput(def: GeneratorDef, owned: number): Decimal {
  return new Decimal(def.baseOutput).mul(owned);
}

/** Total euros per second across all generators. */
export function outputPerSecond(state: GameState): Decimal {
  let total = new Decimal(0);
  for (const def of GENERATORS) {
    total = total.add(generatorOutput(def, state.generators[def.id]));
  }
  return total;
}
