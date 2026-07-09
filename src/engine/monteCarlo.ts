import { runTrial } from './battleSequencer';
import { defaultRng } from './rng';
import type { BattleInput, TrialResult, UnitDefinition, UnitType } from './types';
import type { Rng } from './rng';

/** Runs `input.trialCount` independent Monte Carlo trials of the battle. */
export function runSimulation(
  input: BattleInput,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng = defaultRng,
): TrialResult[] {
  const results: TrialResult[] = [];
  for (let i = 0; i < input.trialCount; i++) {
    results.push(runTrial(input, catalog, rng));
  }
  return results;
}
