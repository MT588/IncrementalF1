import type { UpgradeDef } from '../types';

/** Every player-facing string lives here so a translation layer can replace this file later. */
export const STRINGS = {
  GAME_NAME: 'IncrementalF1',
  TAGLINE: 'Start in the backyard. Finish on the grid.',
  XP_LABEL: 'XP',
  PER_MINUTE: '/min',
  LAPS_DRIVEN: 'Laps',
  LAP_PAYS: 'A lap pays',
  SPEED: 'Speed',
  RACES: 'Races',
  SHED: 'Shed',
  BUY: 'Buy',
  LEVEL: 'Lvl',

  RESET: 'Reset save',
  RESET_CONFIRM: 'Reset your progress and start over in an empty backyard?',
  LAST_SAVED: 'Saved',
  NEVER_SAVED: 'not yet',
  WELCOME_BACK: 'Welcome back. While you were away the kart drove its way to',
} as const;

/** Accessible name for an upgrade's info toggle. */
export function infoLabel(name: string): string {
  return `What ${name} does`;
}

/** Where the next upgrade sits: the lap count that brings it out. */
export function nextUnlockHint(atLaps: number): string {
  return `Unlocked at ${atLaps} ${atLaps === 1 ? 'lap' : 'laps'} driven`;
}

/**
 * How fast the kart is going right now, for the readout under the track. In
 * km/h, which is the unit a vehicle's speed is read in — and the one that makes
 * "2.4" at the start and "42" when races open both mean something.
 */
export function speedHint(kph: number): string {
  return `${kph.toFixed(1)} km/h`;
}

/**
 * The line in the races panel. Races are a lap count away, not a purchase, so
 * the panel counts laps down rather than quoting a price.
 */
export function racesHint(lapsRemaining: number): string {
  if (lapsRemaining === 0) return 'You have the pace. Races are coming.';
  const laps = lapsRemaining === 1 ? 'lap' : 'laps';
  return `Drive ${lapsRemaining} more ${laps} to unlock races.`;
}

/**
 * What one more level adds, short enough for the buy button: "+0.5 km/h", "+1 XP".
 * Additive effects gain the same amount every level and multiplicative ones the
 * same factor, so this never depends on the level owned.
 */
export function effectDelta(def: UpgradeDef): string {
  const { effect } = def;
  switch (effect.kind) {
    case 'speed':
      return `+${effect.perLevel} km/h`;
    case 'xpFlat':
      return `+${effect.perLevel} XP`;
    case 'xpMult':
      return `×${effect.perLevel} XP`;
    case 'speedMult':
      return `×${effect.perLevel} speed`;
  }
}

/**
 * What the upgrade is worth right now — the line the info tooltip carries.
 * No "current → next" pair: the gain from one more level sits on the buy button.
 */
export function effectNow(def: UpgradeDef, level: number): string {
  const { effect } = def;
  switch (effect.kind) {
    case 'speed':
      return `${(effect.perLevel * level).toFixed(1)} km/h`;
    case 'xpFlat':
      return `+${effect.perLevel * level} XP per lap`;
    case 'xpMult':
      return `${multiplier(effect.perLevel ** level)} XP per lap`;
    case 'speedMult':
      return `${multiplier(effect.perLevel ** level)} speed`;
  }
}

/**
 * A compounded multiplier, to two decimals but with the trailing zeros dropped:
 * ×1, ×1.5, ×2.25. A factor is not an amount — the game shows no fractional XP,
 * but rounding ×1.5 to ×2 would be a lie about what the upgrade does.
 */
function multiplier(value: number): string {
  return `×${Number(value.toFixed(2))}`;
}
