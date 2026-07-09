import type { ArmyComposition, UnitDefinition, UnitType } from './types';
import { ALL_UNIT_TYPES } from './types';

/**
 * Unit stats per the Axis & Allies Europe rulebook (National Reference Charts —
 * these values are universal across nations, not nation-specific).
 */
export const UNIT_CATALOG: Record<UnitType, UnitDefinition> = {
  infantry: { type: 'infantry', domain: 'land', cost: 3, attack: 1, defense: 2, hitsToDestroy: 1 },
  artillery: { type: 'artillery', domain: 'land', cost: 4, attack: 2, defense: 2, hitsToDestroy: 1 },
  armor: { type: 'armor', domain: 'land', cost: 5, attack: 3, defense: 2, hitsToDestroy: 1 },
  aaGun: {
    type: 'aaGun',
    domain: 'land',
    cost: 5,
    attack: 0,
    defense: 1,
    hitsToDestroy: 1,
    isAAGun: true,
  },
  fighter: { type: 'fighter', domain: 'air', cost: 12, attack: 3, defense: 4, hitsToDestroy: 1 },
  bomber: { type: 'bomber', domain: 'air', cost: 15, attack: 4, defense: 1, hitsToDestroy: 1 },
  battleship: {
    type: 'battleship',
    domain: 'sea',
    cost: 24,
    attack: 4,
    defense: 4,
    hitsToDestroy: 2,
    bombard: { maxRoll: 4 },
  },
  carrier: { type: 'carrier', domain: 'sea', cost: 18, attack: 1, defense: 3, hitsToDestroy: 1 },
  destroyer: {
    type: 'destroyer',
    domain: 'sea',
    cost: 12,
    attack: 3,
    defense: 3,
    hitsToDestroy: 1,
    bombard: { maxRoll: 3 },
  },
  submarine: { type: 'submarine', domain: 'sea', cost: 8, attack: 2, defense: 2, hitsToDestroy: 1 },
  transport: { type: 'transport', domain: 'sea', cost: 8, attack: 0, defense: 1, hitsToDestroy: 1 },
};

export function emptyArmyComposition(): ArmyComposition {
  const composition = {} as ArmyComposition;
  for (const type of ALL_UNIT_TYPES) {
    composition[type] = 0;
  }
  return composition;
}
