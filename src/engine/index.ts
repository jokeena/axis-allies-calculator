import { aggregate } from './aggregation';
import { runExpectedBattle } from './expectedBattle';
import { runSimulation } from './monteCarlo';
import { defaultRng } from './rng';
import { UNIT_CATALOG } from './unitCatalog';
import type { AggregatedResult, BattleInput } from './types';
import type { ExpectedBattleResult } from './expectedBattle';

export interface CalculationResult {
  /** Monte Carlo outcome odds and IPC losses. */
  simulation: AggregatedResult;
  /** Deterministic expected-value attrition (survivors, casualties, per-round). */
  expected: ExpectedBattleResult;
}

/** Public entry point: Monte Carlo odds plus the expected-value force report. */
export function runCalculation(input: BattleInput): CalculationResult {
  const trials = runSimulation(input, UNIT_CATALOG, defaultRng);
  return {
    simulation: aggregate(trials, UNIT_CATALOG),
    expected: runExpectedBattle(input, UNIT_CATALOG),
  };
}

export * from './types';
export { UNIT_CATALOG, emptyArmyComposition } from './unitCatalog';
export { detectBattleContext } from './battleDetection';
export { runExpectedBattle } from './expectedBattle';
export type { ExpectedBattleResult, ExpectedRound } from './expectedBattle';
export { DEFAULT_TRIALS, ROUND_CAP } from './constants';
