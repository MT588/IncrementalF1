import type { GameState } from './types';
import { bulkCost, isUnlocked } from './formulas';
import { getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';

/**
 * Buy `amount` levels of an upgrade with XP. Returns the same state object when
 * the upgrade is unaffordable, or still locked behind its lap count.
 *
 * The only action there is. The kart drives itself, so choosing what to spend a
 * lap's XP on is the whole of what the player does.
 */
export function buyUpgrade(state: GameState, id: UpgradeId, amount = 1): GameState {
  if (amount <= 0) return state;
  const def = getUpgrade(id);
  if (!isUnlocked(state, def)) return state;
  const level = state.upgrades[id];
  const cost = bulkCost(def, level, amount);
  if (state.xp.lt(cost)) return state;
  return {
    ...state,
    xp: state.xp.sub(cost),
    upgrades: { ...state.upgrades, [id]: level + amount },
  };
}

/** Whether the buy button should be live: revealed, and paid for. */
export function canAfford(state: GameState, id: UpgradeId, amount = 1): boolean {
  const def = getUpgrade(id);
  if (!isUnlocked(state, def)) return false;
  return state.xp.gte(bulkCost(def, state.upgrades[id], amount));
}
