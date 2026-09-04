import Decimal from 'break_infinity.js';
import type { GameState, UpgradeDef } from './types';
import { getTrack } from './data/tracks';
import { UPGRADES } from './data/upgrades';

/** Metres covered by one push of the pedals before any gear upgrades. */
export const BASE_TAP_METRES = 1;

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

/**
 * Metres covered by one push of the pedals. Used both by a hand tap and by the
 * training partner, so gears make manual and automatic pedalling better alike.
 */
export function metresPerTap(state: GameState): number {
  let metres = BASE_TAP_METRES;
  for (const def of UPGRADES) {
    if (def.effect.kind === 'tapMetres') metres += def.effect.perLevel * state.upgrades[def.id];
  }
  return metres;
}

/**
 * Metres per second covered without tapping. Zero until something pedals by itself.
 * Additive sources first — auto-pedal, plus the training partner's taps, each worth
 * a full `metresPerTap` — then the multipliers apply to that whole total.
 */
export function autoSpeedMps(state: GameState): number {
  let mps = 0;
  let multiplier = 1;
  const perTap = metresPerTap(state);
  for (const def of UPGRADES) {
    const level = state.upgrades[def.id];
    if (level === 0) continue;
    switch (def.effect.kind) {
      case 'speed':
        mps += def.effect.perLevel * level;
        break;
      case 'autoTaps':
        mps += def.effect.perLevel * level * perTap;
        break;
      case 'speedMult':
        multiplier *= def.effect.perLevel ** level;
        break;
      case 'xpMult':
      case 'tapMetres':
        break;
    }
  }
  return mps * multiplier;
}

/**
 * XP paid for completing one lap of the current track, with xpMult upgrades applied.
 * Derived from the distance: a lap is worth the metres it takes to ride it.
 */
export function xpPerLap(state: GameState): Decimal {
  const track = getTrack(state.trackId);
  let xp = new Decimal(track.lapDistanceM).mul(track.xpPerMetre);
  for (const def of UPGRADES) {
    if (def.effect.kind !== 'xpMult') continue;
    const level = state.upgrades[def.id];
    if (level > 0) xp = xp.mul(Decimal.pow(def.effect.perLevel, level));
  }
  return xp;
}

/**
 * XP per second while idle — derived, for the header readout only.
 * Auto-pedalling covers `autoSpeedMps` metres a second, so it finishes
 * `autoSpeedMps / lapDistanceM` laps a second, each worth `xpPerLap`.
 *
 * Note that lap distance cancels out: `xpPerLap` is proportional to it, so the
 * idle rate is really `autoSpeedMps × xpPerMetre × multipliers`. Moving to a
 * longer track pays the same per second, only in larger and rarer chunks.
 */
export function xpPerSecond(state: GameState): Decimal {
  const speed = autoSpeedMps(state);
  if (speed === 0) return new Decimal(0);
  return xpPerLap(state).mul(speed / getTrack(state.trackId).lapDistanceM);
}

/**
 * Whether an upgrade has been revealed yet. Takes the lap count rather than the
 * whole state so the UI can subscribe to that one number instead of re-rendering
 * the shed on every tick.
 */
export function isUnlockedAt(totalLaps: number, def: UpgradeDef): boolean {
  return totalLaps >= def.unlockAtLaps;
}

export function isUnlocked(state: GameState, def: UpgradeDef): boolean {
  return isUnlockedAt(state.totalLaps, def);
}

/** The upgrades on show, in list order. */
export function unlockedUpgrades(totalLaps: number): readonly UpgradeDef[] {
  return UPGRADES.filter((def) => isUnlockedAt(totalLaps, def));
}

/**
 * Laps needed for the next upgrade to appear, or null once everything is out.
 * Drives the "keep riding" hint under the shed.
 */
export function nextUnlockAtLaps(totalLaps: number): number | null {
  const gates = UPGRADES.filter((def) => !isUnlockedAt(totalLaps, def)).map(
    (def) => def.unlockAtLaps,
  );
  return gates.length === 0 ? null : Math.min(...gates);
}
