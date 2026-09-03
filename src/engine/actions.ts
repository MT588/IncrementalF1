import type { GameState } from './types';
import { bulkCost } from './formulas';
import { addDistance } from './tick';
import { getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';

/** Metres covered by one tap of the pedal button. */
export const TAP_METRES = 1;

/** The manual action: one push of the pedals. Money only arrives when a lap completes. */
export function pedal(state: GameState): GameState {
  const moved = addDistance(state, TAP_METRES);
  return { ...moved, totalTapsM: state.totalTapsM + TAP_METRES };
}

/** Buy `amount` levels of an upgrade. Returns the same state object if unaffordable. */
export function buyUpgrade(state: GameState, id: UpgradeId, amount = 1): GameState {
  if (amount <= 0) return state;
  const def = getUpgrade(id);
  const level = state.upgrades[id];
  const cost = bulkCost(def, level, amount);
  if (state.money.lt(cost)) return state;
  return {
    ...state,
    money: state.money.sub(cost),
    upgrades: { ...state.upgrades, [id]: level + amount },
  };
}

export function canAfford(state: GameState, id: UpgradeId, amount = 1): boolean {
  const def = getUpgrade(id);
  return state.money.gte(bulkCost(def, state.upgrades[id], amount));
}
