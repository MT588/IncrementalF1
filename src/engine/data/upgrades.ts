import type { UpgradeDef } from '../types';

export type UpgradeId =
  'biggerGears' | 'autoPedal' | 'betterBike' | 'slipstream' | 'trainingPartner';

/**
 * Every upgrade is repeatable: cost grows per level, the effect stacks.
 * Effects are data (see UpgradeEffect) so formulas.ts stays a switch over this list.
 *
 * Listed in the order they open up, which is also cheapest first. `unlockAtLaps`
 * keeps the shed short at the start: an upgrade is hidden until that many laps
 * have been completed, so the player meets one new thing at a time.
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'biggerGears',
    name: 'Bigger gears',
    description: 'A longer chainring. Every push of the pedals travels further.',
    // The first upgrade, priced at exactly one lap of the starting track, so it
    // is affordable the moment that first lap completes. Every other price in
    // the shed reads the same way: a cost in XP is a count of laps.
    baseCost: 1,
    growth: 1.9,
    unlockAtLaps: 0,
    effect: { kind: 'clickMetres', perLevel: 1 },
  },
  {
    id: 'autoPedal',
    name: 'Auto-pedal',
    description: 'Your legs keep turning on their own. Slowly.',
    baseCost: 3,
    growth: 1.15,
    unlockAtLaps: 1,
    effect: { kind: 'speed', perLevel: 0.5 },
  },
  {
    id: 'betterBike',
    name: 'Racing tyres',
    description: 'Grippier rubber. Every finished lap pays more.',
    baseCost: 5,
    growth: 1.6,
    unlockAtLaps: 3,
    effect: { kind: 'xpMult', perLevel: 1.5 },
  },
  {
    id: 'slipstream',
    name: 'Slipstream',
    description: 'Tuck in behind the neighbour. Everything that rolls, rolls faster.',
    baseCost: 30,
    growth: 2.2,
    unlockAtLaps: 10,
    effect: { kind: 'speedMult', perLevel: 1.2 },
  },
  {
    id: 'trainingPartner',
    name: 'Training partner',
    description: 'Someone else pushes the pedals for you — with your gears on.',
    baseCost: 80,
    growth: 1.5,
    unlockAtLaps: 20,
    effect: { kind: 'autoClicks', perLevel: 0.5 },
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}
