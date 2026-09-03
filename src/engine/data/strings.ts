import type { UpgradeDef } from '../types';

/** Every player-facing string lives here so a translation layer can replace this file later. */
export const STRINGS = {
  GAME_NAME: 'IncrementalF1',
  TAGLINE: 'Start in the backyard. Finish on the grid.',
  MONEY_LABEL: 'Money',
  PER_SECOND: '/s',
  PEDAL: 'Pedal',
  PEDAL_HINT: '+1 m per tap',
  LAPS_DRIVEN: 'Laps',
  LAP_PAYS: 'A lap pays',
  SHED: 'Shed',
  BUY: 'Buy',
  LEVEL: 'Lvl',
  EFFECT: 'Effect',
  COST: 'Cost',
  RESET: 'Reset save',
  RESET_CONFIRM: 'Reset your progress and start over in an empty backyard?',
  LAST_SAVED: 'Saved',
  NEVER_SAVED: 'not yet',
  WELCOME_BACK: 'Welcome back. While you were away you pedalled your way to',
} as const;

/** One line describing what an upgrade currently does, and what the next level adds. */
export function effectSummary(def: UpgradeDef, level: number): string {
  const { effect } = def;
  switch (effect.kind) {
    case 'speed':
      return level === 0
        ? `Pedals itself at ${effect.perLevel} m/s`
        : `${(effect.perLevel * level).toFixed(1)} m/s → ${(effect.perLevel * (level + 1)).toFixed(1)} m/s`;
    case 'payout':
      return level === 0
        ? `×${effect.perLevel} money per lap`
        : `×${(effect.perLevel ** level).toFixed(2)} → ×${(effect.perLevel ** (level + 1)).toFixed(2)} per lap`;
  }
}
