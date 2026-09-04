import { create } from 'zustand';
import type { GameState } from '@/engine/types';
import type { UpgradeId } from '@/engine/data/upgrades';
import { buyUpgrade, click } from '@/engine/actions';
import { createInitialState } from '@/engine/state';
import { advanceTo } from '@/engine/tick';

export interface GameStore {
  state: GameState;
  /** ms since epoch of the last successful save, null when never saved. */
  lastSavedAt: number | null;
  /** XP earned while the tab was away, shown once as a welcome-back notice. */
  offlineXp: GameState['xp'] | null;

  /** One click on the track: the manual way to cover distance. */
  click: () => void;
  buy: (id: UpgradeId, amount?: number) => void;
  /** Advance the simulation to `nowMs` (used by the loop and by offline catch-up). */
  advance: (nowMs: number, maxCatchUpSeconds?: number) => void;
  replace: (state: GameState) => void;
  reset: () => void;
  markSaved: (at: number) => void;
  dismissOfflineXp: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(Date.now()),
  lastSavedAt: null,
  offlineXp: null,

  click: () => set({ state: click(get().state) }),
  buy: (id, amount = 1) => set({ state: buyUpgrade(get().state, id, amount) }),
  advance: (nowMs, maxCatchUpSeconds) => {
    const before = get().state;
    const { state, simulatedSeconds } = advanceTo(before, nowMs, maxCatchUpSeconds);
    // Anything over a minute counts as "away": surface it once to the player.
    const earned = state.xp.sub(before.xp);
    const offlineXp = simulatedSeconds >= 60 && earned.gt(0) ? earned : get().offlineXp;
    set({ state, offlineXp });
  },
  replace: (state) => set({ state, offlineXp: null }),
  reset: () => set({ state: createInitialState(Date.now()), lastSavedAt: null, offlineXp: null }),
  markSaved: (at) => set({ lastSavedAt: at }),
  dismissOfflineXp: () => set({ offlineXp: null }),
}));

/** Non-hook access for services (loop, autosave). */
export const gameStore = useGameStore;
