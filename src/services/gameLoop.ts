import type { useGameStore } from '@/store/gameStore';

type Store = typeof useGameStore;

/** Fixed simulation step: 10 ticks per second. */
export const TICK_MS = 100;
/** Gaps larger than this are handled as catch-up in one call rather than many small ticks. */
const CATCH_UP_THRESHOLD_MS = 2000;

/**
 * Drive the simulation from requestAnimationFrame with a fixed timestep.
 * Pauses while the tab is hidden and catches up on return. Returns a stop function.
 */
export function startGameLoop(store: Store, now: () => number = Date.now): () => void {
  let rafId: number | null = null;
  let running = false;

  const frame = () => {
    if (!running) return;
    const state = store.getState().state;
    const nowMs = now();
    const gap = nowMs - state.lastTickAt;

    if (gap >= CATCH_UP_THRESHOLD_MS) {
      store.getState().advance(nowMs);
    } else if (gap >= TICK_MS) {
      // Only advance in whole ticks; leave the remainder for the next frame.
      const ticks = Math.floor(gap / TICK_MS);
      store.getState().advance(state.lastTickAt + ticks * TICK_MS);
    }
    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    running = true;
    store.getState().advance(now());
    rafId = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  };

  document.addEventListener('visibilitychange', onVisibility);
  start();

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
