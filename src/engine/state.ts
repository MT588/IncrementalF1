import Decimal from 'break_infinity.js';
import type { GameState } from './types';
import { GENERATOR_IDS } from './data/generators';
import type { GeneratorId } from './data/generators';

export function createInitialState(now: number): GameState {
  const generators = Object.fromEntries(GENERATOR_IDS.map((id) => [id, 0])) as Record<
    GeneratorId,
    number
  >;
  return {
    money: new Decimal(0),
    totalLaps: 0,
    generators,
    lastTickAt: now,
    createdAt: now,
  };
}
