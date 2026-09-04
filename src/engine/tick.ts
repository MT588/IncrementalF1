import type { GameState } from './types';
import { getTrack } from './data/tracks';
import { autoSpeedMps, xpPerLap } from './formulas';

/** Default cap on offline catch-up: 8 hours. */
export const MAX_CATCH_UP_SECONDS = 8 * 60 * 60;

/**
 * Move the bike `metres` further round the track, paying out every lap that
 * completes on the way. Both a click and a second of auto-pedalling go through
 * here, so the two can never drift apart. This is the only place any currency
 * is earned — `money` is untouched until races arrive.
 */
export function addDistance(state: GameState, metres: number): GameState {
  if (!(metres > 0)) return state;
  const { lapDistanceM } = getTrack(state.trackId);
  const total = state.lapProgressM + metres;
  const laps = Math.floor(total / lapDistanceM);
  // The remainder carries over: distance past the line is never thrown away.
  const lapProgressM = total - laps * lapDistanceM;
  if (laps === 0) return { ...state, lapProgressM };
  return {
    ...state,
    xp: state.xp.add(xpPerLap(state).mul(laps)),
    totalLaps: state.totalLaps + laps,
    lapProgressM,
  };
}

/** Advance the simulation by `dtSeconds`. Does not touch lastTickAt; callers set that. */
export function tick(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state;
  return addDistance(state, autoSpeedMps(state) * dtSeconds);
}

export interface AdvanceResult {
  state: GameState;
  /** Seconds actually simulated after applying the cap. */
  simulatedSeconds: number;
}

/**
 * Bring the state up to `nowMs`, simulating at most `maxCatchUpSeconds`.
 * Speed and XP per lap cannot change without a purchase, so one call over the
 * whole gap is exact. When a multiplier can change mid-gap this becomes a
 * chunked loop.
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
