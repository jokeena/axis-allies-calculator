import type { ArmyComposition, BattleContext } from './types';
import { UNIT_CATALOG } from './unitCatalog';
import { ALL_UNIT_TYPES } from './types';

/** Only these can capture territory, and only they make a fight a land battle. */
function hasLandTroops(army: ArmyComposition): boolean {
  return army.infantry > 0 || army.artillery > 0 || army.armor > 0;
}

function hasSeaUnits(army: ArmyComposition): boolean {
  return ALL_UNIT_TYPES.some((type) => UNIT_CATALOG[type].domain === 'sea' && army[type] > 0);
}

/**
 * A battle is never land and sea at once:
 *
 * - Land troops (infantry/artillery/armor) on either side make it a LAND
 *   battle. Ships never fight or die in a land battle — the attacker's
 *   battleships and destroyers contribute one-shot bombardment cover fire,
 *   and every other ship simply sits out.
 * - With no land troops anywhere, ships and planes fight a SEA battle.
 * - No land troops and no ships (planes vs. planes, or planes vs. an AA
 *   gun) resolves with land-battle mechanics.
 */
export function detectBattleContext(
  attacker: ArmyComposition,
  defender: ArmyComposition,
): BattleContext {
  if (hasLandTroops(attacker) || hasLandTroops(defender)) {
    const bombardmentSupport = attacker.battleship > 0 || attacker.destroyer > 0;
    const shipsPresent = hasSeaUnits(attacker) || hasSeaUnits(defender);
    return {
      type: 'land',
      bombardmentSupport,
      note: shipsPresent
        ? 'With land troops involved this is a land battle — ships cannot be lost. Attacker battleships and destroyers fire one-time cover shots; all other ships sit out.'
        : undefined,
    };
  }

  if (hasSeaUnits(attacker) || hasSeaUnits(defender)) {
    return {
      type: 'naval',
      bombardmentSupport: false,
      note:
        defender.bomber > 0
          ? 'Defending bombers cannot fight in a sea battle — they sit this one out.'
          : undefined,
    };
  }

  return { type: 'land', bombardmentSupport: false };
}
