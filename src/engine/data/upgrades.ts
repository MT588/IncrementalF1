import type { UpgradeDef } from '../types';

export type UpgradeId = 'throttle' | 'racingTyres' | 'biggerEngine' | 'slipstream' | 'raceCraft';

/**
 * Every upgrade is repeatable: cost grows per level, the effect stacks.
 * Effects are data (see UpgradeEffect) so formulas.ts stays a switch over this list.
 *
 * Two ladders run side by side. Speed upgrades make laps arrive faster and are
 * deliberately modest, because a backyard kart doing three figures is absurd and
 * speed is the number the player can see on the panel. XP upgrades make each lap
 * worth more and carry the exponential growth: the tyres add flat XP where the
 * numbers are small, race craft multiplies once they are not.
 *
 * Listed in the order they open up, which is also cheapest first. `unlockAtLaps`
 * keeps the shed short at the start: an upgrade is hidden until that many laps
 * have been completed, so the player meets one new thing at a time.
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'throttle',
    name: 'Throttle',
    description: 'A stiffer spring on the pedal. The kart holds more speed round the yard.',
    // The first upgrade, priced at exactly one lap of the starting track, so it
    // is affordable the moment that first lap completes. Every other price in
    // the shed reads the same way: a cost in XP is a count of laps.
    baseCost: 1,
    growth: 1.45,
    unlockAtLaps: 0,
    effect: { kind: 'speed', perLevel: 0.5 },
  },
  {
    id: 'racingTyres',
    name: 'Racing tyres',
    description: 'Slicks. Grippier rubber, and every finished lap pays more.',
    // Flat rather than multiplied, because this is bought while a lap pays 1 XP:
    // a x1.5 there is worth half an XP and the payout rounds it away, whereas
    // +1 is the whole payout again and reads on the panel the moment it lands.
    baseCost: 3,
    growth: 1.35,
    unlockAtLaps: 3,
    effect: { kind: 'xpFlat', perLevel: 1 },
  },
  {
    id: 'biggerEngine',
    name: 'Bigger engine',
    description: 'A second-hand 60cc off the noticeboard. Proper pull.',
    baseCost: 10,
    growth: 1.9,
    unlockAtLaps: 8,
    effect: { kind: 'speed', perLevel: 2 },
  },
  {
    id: 'slipstream',
    name: 'Slipstream',
    description: "Tuck in behind the neighbour's kart. Everything that rolls, rolls faster.",
    baseCost: 25,
    growth: 3.0,
    unlockAtLaps: 15,
    effect: { kind: 'speedMult', perLevel: 1.1 },
  },
  {
    id: 'raceCraft',
    name: 'Race craft',
    description: 'You start reading the corners. Every lap teaches you more than the last.',
    // Slipstream's opposite number: what that does to speed, this does to what a
    // lap is worth. It is also the last thing the backyard has to teach, so
    // buying it is what puts races on the board.
    baseCost: 50,
    growth: 2.2,
    unlockAtLaps: 20,
    effect: { kind: 'xpMult', perLevel: 1.5 },
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}
