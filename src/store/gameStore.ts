import { create } from 'zustand';
import type { GameState } from '@/engine/types';
import type { GeneratorId } from '@/engine/data/generators';
import { buyGenerator, driveLap } from '@/engine/actions';
import { createInitialState } from '@/engine/state';
import { advanceTo } from '@/engine/tick';

export interface GameStore {
  state: GameState;
  /** ms since epoch of the last successful save, null when never saved. */
  lastSavedAt: number | null;
  /** Money earned while the tab was away, shown once as a welcome-back notice. */
  offlineEarnings: GameState['money'] | null;

  driveLap: () => void;
  buy: (id: GeneratorId, amount?: number) => void;
  /** Advance the simulation to `nowMs` (used by the loop and by offline catch-up). */
  advance: (nowMs: number, maxCatchUpSeconds?: number) => void;
  replace: (state: GameState) => void;
  reset: () => void;
  markSaved: (at: number) => void;
  dismissOfflineEarnings: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(Date.now()),
  lastSavedAt: null,
  offlineEarnings: null,

  driveLap: () => set({ state: driveLap(get().state) }),
  buy: (id, amount = 1) => set({ state: buyGenerator(get().state, id, amount) }),
  advance: (nowMs, maxCatchUpSeconds) => {
    const before = get().state;
    const { state, simulatedSeconds } = advanceTo(before, nowMs, maxCatchUpSeconds);
    // Anything over a minute counts as "away": surface it once to the player.
    const earned = state.money.sub(before.money);
    const offlineEarnings = simulatedSeconds >= 60 && earned.gt(0) ? earned : get().offlineEarnings;
    set({ state, offlineEarnings });
  },
  replace: (state) => set({ state, offlineEarnings: null }),
  reset: () =>
    set({ state: createInitialState(Date.now()), lastSavedAt: null, offlineEarnings: null }),
  markSaved: (at) => set({ lastSavedAt: at }),
  dismissOfflineEarnings: () => set({ offlineEarnings: null }),
}));

/** Non-hook access for services (loop, autosave). */
export const gameStore = useGameStore;
