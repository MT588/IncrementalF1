import type { UpgradeDef } from '../types';

export type UpgradeId = 'autoPedal' | 'betterBike';

/**
 * Every upgrade is repeatable: cost grows per level, the effect stacks.
 * Effects are data (see UpgradeEffect) so formulas.ts stays a switch over this list.
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'autoPedal',
    name: 'Auto-pedal',
    description: 'Your legs keep turning on their own. Slowly.',
    baseCost: 10,
    growth: 1.15,
    effect: { kind: 'speed', perLevel: 0.5 },
  },
  {
    id: 'betterBike',
    name: 'Racing tyres',
    description: 'Grippier rubber. Every finished lap pays more.',
    baseCost: 25,
    growth: 1.6,
    effect: { kind: 'payout', perLevel: 1.5 },
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}
