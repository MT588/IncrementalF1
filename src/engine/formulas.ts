import Decimal from 'break_infinity.js';
import type { GameState, UpgradeDef } from './types';
import { getTrack } from './data/tracks';
import { UPGRADES } from './data/upgrades';

/** Metres covered by one click before any gear upgrades. */
export const BASE_CLICK_METRES = 1;

/**
 * Cost of the next level when `level` levels are already owned. The curve is
 * geometric — baseCost × growth^level — but a price is a whole number of XP,
 * because a lap pays a whole number and a price of 3.61 is quoted in a unit
 * nobody earns.
 *
 * Rounding alone would not be enough. A shallow growth on a small base steps by
 * less than an XP for its first several levels — auto-pedal's 1.15 on a base of
 * 3 goes 3, 3.45, 3.97, 4.56 — so consecutive rungs would round to the same
 * price and the ladder would read as stuck. **Every level costs at least one XP
 * more than the one below it.** That floor is `baseCost + level`, and it bites
 * only while the curve is flatter than an XP a level: the geometric term
 * overtakes it exactly once and never falls back, so the two together are still
 * a single strictly increasing ladder.
 *
 * Auto-pedal comes out 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 21 —
 * linear while the curve is too flat to see, geometric from the moment it is not.
 */
export function costOf(def: UpgradeDef, level: number): Decimal {
  const curve = new Decimal(def.baseCost).mul(Decimal.pow(def.growth, level)).round();
  return Decimal.max(curve, def.baseCost + level);
}

/**
 * Cost of buying `amount` levels starting at `level`: the whole prices summed.
 *
 * Not the closed-form geometric series any more — `costOf` rounds each rung and
 * puts a floor under it, and the sum of those is not the series of the raw
 * curve. `amount` comes from a buy button, so the loop is as long as the player
 * asked for and no longer.
 */
export function bulkCost(def: UpgradeDef, level: number, amount: number): Decimal {
  let total = new Decimal(0);
  for (let n = 0; n < amount; n++) total = total.add(costOf(def, level + n));
  return total;
}

/**
 * Metres covered by one click. Used both by a click of the player's and by the
 * training partner, so gears make manual and automatic pedalling better alike.
 */
export function metresPerClick(state: GameState): number {
  let metres = BASE_CLICK_METRES;
  for (const def of UPGRADES) {
    if (def.effect.kind === 'clickMetres') metres += def.effect.perLevel * state.upgrades[def.id];
  }
  return metres;
}

/**
 * Metres per second covered without clicking. Zero until something pedals by itself.
 * Additive sources first — auto-pedal, plus the training partner's clicks, each worth
 * a full `metresPerClick` — then the multipliers apply to that whole total.
 */
export function autoSpeedMps(state: GameState): number {
  let mps = 0;
  let multiplier = 1;
  const perClick = metresPerClick(state);
  for (const def of UPGRADES) {
    const level = state.upgrades[def.id];
    if (level === 0) continue;
    switch (def.effect.kind) {
      case 'speed':
        mps += def.effect.perLevel * level;
        break;
      case 'autoClicks':
        mps += def.effect.perLevel * level * perClick;
        break;
      case 'speedMult':
        multiplier *= def.effect.perLevel ** level;
        break;
      case 'xpMult':
      case 'clickMetres':
        break;
    }
  }
  return mps * multiplier;
}

/**
 * XP paid for completing one lap of the current track, with xpMult upgrades applied.
 * Derived from the distance: a lap is worth the metres it takes to ride it.
 *
 * Rounded up to a whole XP, which is what makes the payout a growth signal at
 * all. A lap of the backyard pays 1, and the game shows no fractions, so a
 * ×1.5 left to itself would pay 1.5 and read as the same 1 XP it paid before —
 * a bought upgrade that looks like it did nothing. Ceiling it instead gives
 * 1, 2, 3, 4, 6, 8, 12: every level lands on a number the player can see change.
 *
 * The multipliers still compound on the exact value, so the rounding is applied
 * once at the end and never accumulates into the curve.
 */
export function xpPerLap(state: GameState): Decimal {
  const track = getTrack(state.trackId);
  let xp = new Decimal(track.lapDistanceM).mul(track.xpPerMetre);
  for (const def of UPGRADES) {
    if (def.effect.kind !== 'xpMult') continue;
    const level = state.upgrades[def.id];
    if (level > 0) xp = xp.mul(Decimal.pow(def.effect.perLevel, level));
  }
  return xp.ceil();
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
 * XP a minute while idle — the header readout. Per minute rather than per
 * second because nothing on screen is shown as a fraction: the first level of
 * auto-pedal finishes a lap a minute, which is 1 XP a minute but 0.0167 a
 * second. Rounded to a whole number, per second reads "+0/s" for a long while;
 * per minute reads "+1/min" from the moment the upgrade is bought.
 */
export function xpPerMinute(state: GameState): Decimal {
  return xpPerSecond(state).mul(60);
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
