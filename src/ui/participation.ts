import { UNIT_CATALOG } from '../engine';
import type { BattleContext, UnitType } from '../engine';

/**
 * Whether this unit type actually fights (and can be lost) in the battle.
 * A battle is never land and sea at once: land battles are fought by land
 * troops + aircraft (ships never die — attacker battleships/destroyers only
 * lend one-shot cover fire), and sea battles by ships + aircraft.
 */
export function participatesInBattle(type: UnitType, context: BattleContext): boolean {
  const domain = UNIT_CATALOG[type].domain;
  if (context.type === 'naval') return domain === 'sea' || domain === 'air';
  return domain === 'land' || domain === 'air';
}
