import Decimal from 'break_infinity.js';
import type { GameState, UpgradeDef } from './types';
import { getTrack } from './data/tracks';
import { UPGRADES } from './data/upgrades';

/** Cost of the next level when `level` levels are already owned: baseCost × growth^level. */
export function costOf(def: UpgradeDef, level: number): Decimal {
  return new Decimal(def.baseCost).mul(Decimal.pow(def.growth, level));
}

/**
 * Cost of buying `amount` levels starting at `level`. Geometric series:
 * baseCost × growth^level × (growth^amount − 1) / (growth − 1).
 */
export function bulkCost(def: UpgradeDef, level: number, amount: number): Decimal {
  if (amount <= 0) return new Decimal(0);
  if (def.growth === 1) return new Decimal(def.baseCost).mul(amount);
  const first = costOf(def, level);
  const ratio = new Decimal(def.growth);
  return first.mul(ratio.pow(amount).sub(1)).div(ratio.sub(1));
}

/** Metres per second covered without tapping. Zero until the first auto-pedal level. */
export function autoSpeedMps(state: GameState): number {
  let mps = 0;
  for (const def of UPGRADES) {
    if (def.effect.kind === 'speed') mps += def.effect.perLevel * state.upgrades[def.id];
  }
  return mps;
}

/** Euros paid for completing one lap of the current track, with payout upgrades applied. */
export function moneyPerLap(state: GameState): Decimal {
  let money = new Decimal(getTrack(state.trackId).payoutPerLap);
  for (const def of UPGRADES) {
    if (def.effect.kind !== 'payout') continue;
    const level = state.upgrades[def.id];
    if (level > 0) money = money.mul(Decimal.pow(def.effect.perLevel, level));
  }
  return money;
}

/**
 * Euros per second while idle — derived, for the header readout only.
 * Auto-pedalling covers `autoSpeedMps` metres a second, so it finishes
 * `autoSpeedMps / lapDistanceM` laps a second, each worth `moneyPerLap`.
 */
export function outputPerSecond(state: GameState): Decimal {
  const speed = autoSpeedMps(state);
  if (speed === 0) return new Decimal(0);
  return moneyPerLap(state).mul(speed / getTrack(state.trackId).lapDistanceM);
}
