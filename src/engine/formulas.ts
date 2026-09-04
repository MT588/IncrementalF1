import Decimal from 'break_infinity.js';
import type { GameState, UpgradeDef } from './types';
import { getTrack } from './data/tracks';
import { UPGRADES } from './data/upgrades';

/**
 * Metres per second the kart covers with nothing bought at all. The game has no
 * manual action: this is what makes it move from the first second, so a lap of
 * the ten-metre backyard lands ten seconds in and the shed is open on the first.
 */
export const BASE_SPEED_MPS = 1;

/**
 * Cost of the next level when `level` levels are already owned. The curve is
 * geometric — baseCost × growth^level — but a price is a whole number of XP,
 * because a lap pays a whole number and a price of 3.61 is quoted in a unit
 * nobody earns.
 *
 * Rounding alone would not be enough. A shallow growth on a small base steps by
 * less than an XP for its first several levels — the throttle's 1.3 on a base of
 * 1 goes 1, 1.3, 1.69, 2.2 — so consecutive rungs would round to the same price
 * and the ladder would read as stuck. **Every level costs at least one XP more
 * than the one below it.** That floor is `baseCost + level`, and it bites only
 * while the curve is flatter than an XP a level: the geometric term overtakes it
 * exactly once and never falls back, so the two together are still a single
 * strictly increasing ladder.
 *
 * The throttle comes out 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 18, 23, 30 — linear
 * while the curve is too flat to see, geometric from the moment it is not.
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
 * How fast the kart is going, in metres per second. Never zero: it starts at
 * `BASE_SPEED_MPS` and every upgrade only adds to that.
 *
 * Additive sources first — the throttle and the engine, both `speed` — then the
 * multipliers apply to that whole total, so a bigger engine makes every later
 * slipstream level worth more rather than the two competing.
 */
export function speedMps(state: GameState): number {
  let mps = BASE_SPEED_MPS;
  let multiplier = 1;
  for (const def of UPGRADES) {
    const level = state.upgrades[def.id];
    if (level === 0) continue;
    switch (def.effect.kind) {
      case 'speed':
        mps += def.effect.perLevel * level;
        break;
      case 'speedMult':
        multiplier *= def.effect.perLevel ** level;
        break;
      case 'xpMult':
        break;
    }
  }
  return mps * multiplier;
}

/**
 * XP paid for completing one lap of the current track, with xpMult upgrades applied.
 * Derived from the distance: a lap is worth the metres it takes to drive it.
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
 * XP per second — derived, for the header readout only. The kart covers
 * `speedMps` metres a second, so it finishes `speedMps / lapDistanceM` laps a
 * second, each worth `xpPerLap`.
 *
 * Note that lap distance cancels out: `xpPerLap` is proportional to it, so the
 * rate is really `speedMps × xpPerMetre × multipliers`. Moving to a longer track
 * pays the same per second, only in larger and rarer chunks.
 */
export function xpPerSecond(state: GameState): Decimal {
  return xpPerLap(state).mul(speedMps(state) / getTrack(state.trackId).lapDistanceM);
}

/**
 * XP a minute — the header readout. Per minute rather than per second because
 * nothing on screen is shown as a fraction: the kart starts at 0.1 XP a second,
 * which rounds to "+0/s" and would sit there through the whole early game. Per
 * minute it reads "+6/min" from the moment the page loads.
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
 * Drives the "keep driving" hint under the shed.
 */
export function nextUnlockAtLaps(totalLaps: number): number | null {
  const gates = UPGRADES.filter((def) => !isUnlockedAt(totalLaps, def)).map(
    (def) => def.unlockAtLaps,
  );
  return gates.length === 0 ? null : Math.min(...gates);
}
