import type { GameState } from './types';
import { bulkCost, isUnlocked, metresPerTap } from './formulas';
import { addDistance } from './tick';
import { getUpgrade } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';

/**
 * The manual action: one push of the pedals. XP only arrives when a lap
 * completes. How far a tap carries depends on the gears (see metresPerTap).
 */
export function pedal(state: GameState): GameState {
  const metres = metresPerTap(state);
  const moved = addDistance(state, metres);
  return { ...moved, totalTapsM: state.totalTapsM + metres };
}

/**
 * Buy `amount` levels of an upgrade with XP. Returns the same state object when
 * the upgrade is unaffordable, or still locked behind its lap count.
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
