import type { GameState } from '@/engine/types';
import { deserialize, serialize } from '@/engine/save/serialize';
import type { useGameStore } from '@/store/gameStore';

type Store = typeof useGameStore;

export const SAVE_KEY = 'incf1:save';
export const AUTOSAVE_MS = 10_000;

/** Every storage access is guarded: private mode, quota, or blocked storage must never crash the game. */
export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(state: GameState, at: number = Date.now()): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state, at));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Save on an interval and whenever the tab is hidden or unloaded. Returns a stop function. */
export function startAutosave(store: Store, intervalMs = AUTOSAVE_MS): () => void {
  const saveNow = () => {
    const at = Date.now();
    if (writeSave(store.getState().state, at)) store.getState().markSaved(at);
  };

  const timer = setInterval(saveNow, intervalMs);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') saveNow();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', saveNow);

  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', saveNow);
  };
}
