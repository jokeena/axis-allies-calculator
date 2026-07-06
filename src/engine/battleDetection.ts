import type { ArmyComposition, BattleContext, Domain } from './types';
import { UNIT_CATALOG } from './unitCatalog';

function hasDomain(army: ArmyComposition, domain: Domain): boolean {
  return (Object.keys(army) as Array<keyof ArmyComposition>).some(
    (type) => UNIT_CATALOG[type].domain === domain && army[type] > 0,
  );
}

/**
 * Infers what kind of battle this is purely from what's been entered —
 * there's no manual "amphibious assault" toggle in the UI.
 *
 * - No sea units on either side: pure land battle.
 * - Attacker has both land and sea units: amphibious assault. A naval phase
 *   only actually runs if the defender also has naval units to contest the
 *   zone — otherwise the sea is already clear and the attacker's ships go
 *   straight to bombardment support.
 * - Attacker has land units but no navy, while the defender has naval units:
 *   this is a pure land invasion from an adjacent territory — the defender's
 *   naval units aren't part of this fight at all (nothing is attacking them).
 * - Otherwise (attacker has no land units): a naval battle between whatever
 *   sea/air forces are present; the defender's land units and AA gun sit out
 *   since there's no invasion for them to defend against.
 */
export function detectBattleContext(
  attacker: ArmyComposition,
  defender: ArmyComposition,
): BattleContext {
  const attackerHasNavy = hasDomain(attacker, 'sea');
  const attackerHasLand = hasDomain(attacker, 'land');
  const defenderHasNavy = hasDomain(defender, 'sea');

  if (!attackerHasNavy && !defenderHasNavy) {
    return { type: 'land', navalPhaseOccurs: false };
  }

  if (attackerHasNavy && attackerHasLand) {
    return { type: 'amphibious', navalPhaseOccurs: defenderHasNavy };
  }

  if (!attackerHasNavy && attackerHasLand && defenderHasNavy) {
    return {
      type: 'land',
      navalPhaseOccurs: false,
      strandedDefenderNavyNote:
        "Defender naval units won't participate — the attacker has no ships to trigger a naval engagement.",
    };
  }

  return { type: 'naval', navalPhaseOccurs: true };
}
