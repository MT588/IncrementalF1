import Decimal from 'break_infinity.js';
import type { GameState } from './types';
import { STARTING_TRACK_ID } from './data/tracks';
import { UPGRADE_IDS } from './data/upgrades';
import type { UpgradeId } from './data/upgrades';

export function createInitialState(now: number): GameState {
  const upgrades = Object.fromEntries(UPGRADE_IDS.map((id) => [id, 0])) as Record<
    UpgradeId,
    number
  >;
  return {
    xp: new Decimal(0),
    money: new Decimal(0),
    trackId: STARTING_TRACK_ID,
    lapProgressM: 0,
    totalLaps: 0,
    upgrades,
    lastTickAt: now,
    createdAt: now,
  };
}
