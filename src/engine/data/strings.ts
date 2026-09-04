import type { UpgradeDef } from '../types';
import { BASE_TAP_METRES } from '../formulas';

/** Every player-facing string lives here so a translation layer can replace this file later. */
export const STRINGS = {
  GAME_NAME: 'IncrementalF1',
  TAGLINE: 'Start in the backyard. Finish on the grid.',
  XP_LABEL: 'XP',
  PER_SECOND: '/s',
  PEDAL: 'Pedal',
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

/** How far one tap carries right now — the gears change this, so it cannot be a constant. */
export function pedalHint(metresPerTap: number): string {
  return `+${metresPerTap} m per tap`;
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
    case 'tapMetres':
      return `+${effect.perLevel} m`;
    case 'xpMult':
      return `×${effect.perLevel} XP`;
    case 'speedMult':
      return `×${effect.perLevel} speed`;
    case 'autoTaps':
      return `+${effect.perLevel} taps/s`;
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
    case 'tapMetres':
      return `${BASE_TAP_METRES + effect.perLevel * level} m per tap`;
    case 'xpMult':
      return `×${(effect.perLevel ** level).toFixed(2)} XP per lap`;
    case 'speedMult':
      return `×${(effect.perLevel ** level).toFixed(2)} auto-speed`;
    case 'autoTaps':
      return `${(effect.perLevel * level).toFixed(1)} taps a second`;
  }
}
