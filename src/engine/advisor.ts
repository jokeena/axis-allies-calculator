import { aggregate } from './aggregation';
import { detectBattleContext } from './battleDetection';
import { runSimulation } from './monteCarlo';
import { defaultRng } from './rng';
import type { BattleInput, Side, UnitDefinition, UnitType } from './types';
import type { Rng } from './rng';

export interface AdvisorRow {
  side: Side;
  type: UnitType;
  /** Attacker win% (capture% under Ensure Capture) with this +1 unit added. */
  attackerWinPct: number;
  /** Defender win% with this +1 unit added. */
  defenderWinPct: number;
}

/**
 * Which +1 units are worth testing for each side, given the battle type.
 * Only types that actually participate (or contribute cover shots) are
 * tested, and never one that would flip the battle's type — adding an
 * infantry to a sea battle would turn it into a different fight entirely.
 */
export function advisorCandidates(input: BattleInput): Array<{ side: Side; type: UnitType }> {
  const context = detectBattleContext(input.attacker, input.defender);
  const candidates: Array<{ side: Side; type: UnitType }> = [];

  if (context.type === 'land') {
    const attackerTypes: UnitType[] = [
      'infantry',
      'artillery',
      'armor',
      'fighter',
      'bomber',
      // Warships add one-shot cover fire to a land battle.
      'battleship',
      'destroyer',
    ];
    const defenderTypes: UnitType[] = ['infantry', 'artillery', 'armor', 'fighter', 'bomber'];
    for (const type of attackerTypes) candidates.push({ side: 'attacker', type });
    for (const type of defenderTypes) candidates.push({ side: 'defender', type });
    if ((input.defender.aaGun ?? 0) === 0) {
      candidates.push({ side: 'defender', type: 'aaGun' });
    }
  } else {
    const attackerTypes: UnitType[] = [
      'transport',
      'submarine',
      'destroyer',
      'battleship',
      'carrier',
      'fighter',
      'bomber',
    ];
    // Defending bombers never fight at sea, so they're not worth testing.
    const defenderTypes: UnitType[] = [
      'transport',
      'submarine',
      'destroyer',
      'battleship',
      'carrier',
      'fighter',
    ];
    for (const type of attackerTypes) candidates.push({ side: 'attacker', type });
    for (const type of defenderTypes) candidates.push({ side: 'defender', type });
  }

  return candidates;
}

/** Runs one full simulation per +1-unit variant and reports each variant's
 * attacker win%. Sorting and deltas are the display layer's job. */
export function runAdvisor(
  input: BattleInput,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng = defaultRng,
): AdvisorRow[] {
  return advisorCandidates(input).map(({ side, type }) => {
    const variant: BattleInput = {
      ...input,
      attacker: { ...input.attacker },
      defender: { ...input.defender },
    };
    variant[side][type] = (variant[side][type] ?? 0) + 1;
    const result = aggregate(runSimulation(variant, catalog, rng), catalog);
    return { side, type, attackerWinPct: result.attackerWinPct, defenderWinPct: result.defenderWinPct };
  });
}
