import type { GeneratorDef } from '../types';

export type GeneratorId = 'mechanic';

export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: 'mechanic',
    name: 'Mechanic',
    description: 'Keeps the car running so laps happen without you.',
    baseCost: 10,
    growth: 1.1,
    baseOutput: 0.5,
  },
];

export const GENERATOR_IDS: readonly GeneratorId[] = GENERATORS.map((g) => g.id);

export function getGenerator(id: GeneratorId): GeneratorDef {
  const def = GENERATORS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown generator: ${id}`);
  return def;
}
