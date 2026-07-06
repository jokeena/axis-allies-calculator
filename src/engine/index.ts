import { aggregate } from './aggregation';
import { runSimulation } from './monteCarlo';
import { defaultRng } from './rng';
import { UNIT_CATALOG } from './unitCatalog';
import type { AggregatedResult, BattleInput } from './types';

/** Public entry point: runs the Monte Carlo simulation and aggregates results. */
export function runCalculation(input: BattleInput): AggregatedResult {
  const trials = runSimulation(input, UNIT_CATALOG, defaultRng);
  return aggregate(trials, UNIT_CATALOG);
}

export * from './types';
export { UNIT_CATALOG, emptyArmyComposition } from './unitCatalog';
export { detectBattleContext } from './battleDetection';
export { DEFAULT_TRIALS, ROUND_CAP } from './constants';
