import type { UpgradeDef } from '../types';
import { BASE_CLICK_METRES } from '../formulas';

/** Every player-facing string lives here so a translation layer can replace this file later. */
export const STRINGS = {
  GAME_NAME: 'IncrementalF1',
  TAGLINE: 'Start in the backyard. Finish on the grid.',
  XP_LABEL: 'XP',
  PER_MINUTE: '/min',
  CLICK_TRACK: 'Click the track to ride',
  LAPS_DRIVEN: 'Laps',
  LAP_PAYS: 'A lap pays',
  SHED: 'Shed',
  BUY: 'Buy',
  LEVEL: 'Lvl',

  RESET: 'Reset save',
  RESET_CONFIRM: 'Reset your progress and start over in an empty backyard?',
  LAST_SAVED: 'Saved',
  NEVER_SAVED: 'not yet',
  WELCOME_BACK: 'Welcome back. While you were away you pedalled your way to',
} as const;

/** Accessible name for an upgrade's info toggle. */
export function infoLabel(name: string): string {
  return `What ${name} does`;
}

/** Where the next upgrade sits: the lap count that brings it out. */
export function nextUnlockHint(atLaps: number): string {
  return `Unlocked at ${atLaps} ${atLaps === 1 ? 'lap' : 'laps'} driven`;
}

/** How far one click carries right now — the gears change this, so it cannot be a constant. */
export function clickHint(metresPerClick: number): string {
  return `+${metresPerClick} m per click`;
}

/**
 * What one more level adds, short enough for the buy button: "+1 m", "×1.5 XP".
 * Additive effects gain the same amount every level and multiplicative ones the
 * same factor, so this never depends on the level owned.
 */
export function effectDelta(def: UpgradeDef): string {
  const { effect } = def;
  switch (effect.kind) {
    case 'speed':
      return `+${effect.perLevel} m/s`;
    case 'clickMetres':
      return `+${effect.perLevel} m`;
    case 'xpMult':
      return `×${effect.perLevel} XP`;
    case 'speedMult':
      return `×${effect.perLevel} speed`;
    case 'autoClicks':
      return `+${effect.perLevel} clicks/s`;
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
      return `${(effect.perLevel * level).toFixed(1)} m/s`;
    case 'clickMetres':
      return `${BASE_CLICK_METRES + effect.perLevel * level} m per click`;
    case 'xpMult':
      return `${multiplier(effect.perLevel ** level)} XP per lap`;
    case 'speedMult':
      return `${multiplier(effect.perLevel ** level)} auto-speed`;
    case 'autoClicks':
      return `${(effect.perLevel * level).toFixed(1)} clicks a second`;
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
