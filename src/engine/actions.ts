import Decimal from 'break_infinity.js';
import type { GameState } from './types';
import { bulkCost } from './formulas';
import { getGenerator } from './data/generators';
import type { GeneratorId } from './data/generators';

export const LAP_REWARD = new Decimal(1);

/** The manual action: drive one lap by hand for a flat reward. */
export function driveLap(state: GameState): GameState {
  return {
    ...state,
    money: state.money.add(LAP_REWARD),
    totalLaps: state.totalLaps + 1,
  };
}

/** Buy `amount` units of a generator. Returns the same state object if unaffordable. */
export function buyGenerator(state: GameState, id: GeneratorId, amount = 1): GameState {
  if (amount <= 0) return state;
  const def = getGenerator(id);
  const owned = state.generators[id];
  const cost = bulkCost(def, owned, amount);
  if (state.money.lt(cost)) return state;
  return {
    ...state,
    money: state.money.sub(cost),
    generators: { ...state.generators, [id]: owned + amount },
  };
}

export function canAfford(state: GameState, id: GeneratorId, amount = 1): boolean {
  const def = getGenerator(id);
  return state.money.gte(bulkCost(def, state.generators[id], amount));
}
