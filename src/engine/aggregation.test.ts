import { describe, expect, it } from 'vitest';
import { aggregate } from './aggregation';
import { UNIT_CATALOG } from './unitCatalog';
import type { TrialResult } from './types';

// Four synthetic trials, hand-computed expectations below — no simulation
// involved, so every number here is independently verifiable by hand.
const trials: TrialResult[] = [
  {
    outcome: 'attackerWins',
    rounds: [
      { phase: 'land', round: 1, attackerLosses: {}, defenderLosses: { infantry: 2 } },
      { phase: 'land', round: 2, attackerLosses: {}, defenderLosses: { infantry: 1 } },
    ],
  },
  {
    outcome: 'defenderWins',
    rounds: [
      { phase: 'land', round: 1, attackerLosses: { infantry: 1 }, defenderLosses: { infantry: 1 } },
    ],
  },
  {
    outcome: 'tie',
    rounds: [
      { phase: 'land', round: 1, attackerLosses: { infantry: 3 }, defenderLosses: { infantry: 3 } },
    ],
  },
  { outcome: 'attackerWins', rounds: [] },
];

describe('aggregate', () => {
  const result = aggregate(trials, UNIT_CATALOG);

  it('computes win/lose/tie percentages from trial outcomes', () => {
    expect(result.trialsRun).toBe(4);
    expect(result.attackerWinPct).toBe(50);
    expect(result.defenderWinPct).toBe(25);
    expect(result.tiePct).toBe(25);
  });

  it('produces round-by-round expected losses that sum to the total expected loss', () => {
    const round1 = result.roundByRoundLosses.land.find((r) => r.round === 1);
    const round2 = result.roundByRoundLosses.land.find((r) => r.round === 2);

    expect(round1?.defenderLosses.infantry).toBeCloseTo(1.5); // (2+1+3)/4
    expect(round2?.defenderLosses.infantry).toBeCloseTo(0.25); // 1/4
    expect(round1?.attackerLosses.infantry).toBeCloseTo(1.0); // (0+1+3)/4

    const totalDefenderInfantry =
      (round1?.defenderLosses.infantry ?? 0) + (round2?.defenderLosses.infantry ?? 0);
    expect(totalDefenderInfantry).toBeCloseTo(1.75); // (2+1)+(1)+(3)+(0) all / 4 = 7/4
  });

  it('derives death order as the loss-weighted mean round, omitting phases with no losses', () => {
    const defenderOrder = result.deathOrder.defender.land;
    expect(defenderOrder).toHaveLength(1);
    expect(defenderOrder[0].unitType).toBe('infantry');
    expect(defenderOrder[0].avgDeathRound).toBeCloseTo(8 / 7); // (1*6 + 2*1) / 7

    // No naval losses at all in these synthetic trials.
    expect(result.deathOrder.defender.naval).toEqual([]);
    expect(result.deathOrder.attacker.naval).toEqual([]);
  });

  it('derives total IPC loss from the same accumulated loss counts', () => {
    // infantry costs 3 IPC; attacker lost 1.0 expected infantry, defender 1.75.
    expect(result.totalIpcLoss.attacker).toBeCloseTo(3 * 1.0);
    expect(result.totalIpcLoss.defender).toBeCloseTo(3 * 1.75);
  });
});
