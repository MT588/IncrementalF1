import type { GameState } from './types';
import { outputPerSecond } from './formulas';

/** Default cap on offline catch-up: 8 hours. */
export const MAX_CATCH_UP_SECONDS = 8 * 60 * 60;

/** Advance the simulation by `dtSeconds`. Does not touch lastTickAt; callers set that. */
export function tick(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state;
  const earned = outputPerSecond(state).mul(dtSeconds);
  if (earned.eq(0)) return state;
  return { ...state, money: state.money.add(earned) };
}

export interface AdvanceResult {
  state: GameState;
  /** Seconds actually simulated after applying the cap. */
  simulatedSeconds: number;
}

/**
 * Bring the state up to `nowMs`, simulating at most `maxCatchUpSeconds`.
 * Output is linear in M0 so a single tick over the whole gap is exact.
 * When multipliers can change mid-gap this becomes a chunked loop.
 */
export function advanceTo(
  state: GameState,
  nowMs: number,
  maxCatchUpSeconds = MAX_CATCH_UP_SECONDS,
): AdvanceResult {
  const elapsed = Math.max(0, (nowMs - state.lastTickAt) / 1000);
  const simulatedSeconds = Math.min(elapsed, maxCatchUpSeconds);
  const next = tick(state, simulatedSeconds);
  return { state: { ...next, lastTickAt: nowMs }, simulatedSeconds };
}
