import type {
  AggregatedResult,
  DeathOrderEntry,
  Phase,
  RoundLossRow,
  Side,
  TrialResult,
  UnitDefinition,
  UnitLossCounts,
  UnitType,
} from './types';

type SideLossMap = Partial<Record<UnitType, number>>;

interface RoundBucket {
  attacker: SideLossMap;
  defender: SideLossMap;
}

const PHASES: Phase[] = ['naval', 'land'];
const SIDES: Side[] = ['attacker', 'defender'];

function addCounts(target: SideLossMap, source: UnitLossCounts): void {
  for (const key of Object.keys(source) as UnitType[]) {
    target[key] = (target[key] ?? 0) + (source[key] ?? 0);
  }
}

/**
 * Turns raw per-trial round logs into every output the UI needs. Everything
 * is derived from one shared per-phase/per-round/per-side/per-unit-type
 * accumulator, divided by the FULL trial count at every round (not by how
 * many trials reached that round) — that's what makes summing all rounds
 * equal the total expected loss, and lets death-order fall out of the same
 * data with no separate per-trial bookkeeping.
 */
export function aggregate(
  trials: TrialResult[],
  catalog: Record<UnitType, UnitDefinition>,
): AggregatedResult {
  const trialsRun = trials.length;
  let attackerWins = 0;
  let defenderWins = 0;
  let ties = 0;
  let standoffs = 0;
  let clearedNotCaptured = 0;
  const aaTotals: SideLossMap = {};
  const bombardmentTotals: SideLossMap = {};

  const buckets: Record<Phase, Map<number, RoundBucket>> = { naval: new Map(), land: new Map() };

  for (const trial of trials) {
    if (trial.outcome === 'attackerWins') attackerWins++;
    else if (trial.outcome === 'defenderWins') defenderWins++;
    else if (trial.outcome === 'standoff') standoffs++;
    else if (trial.outcome === 'clearedNotCaptured') clearedNotCaptured++;
    else ties++;

    addCounts(aaTotals, trial.aaLosses);
    addCounts(bombardmentTotals, trial.bombardmentLosses);

    for (const roundOutcome of trial.rounds) {
      const phaseBuckets = buckets[roundOutcome.phase];
      let bucket = phaseBuckets.get(roundOutcome.round);
      if (!bucket) {
        bucket = { attacker: {}, defender: {} };
        phaseBuckets.set(roundOutcome.round, bucket);
      }
      addCounts(bucket.attacker, roundOutcome.attackerLosses);
      addCounts(bucket.defender, roundOutcome.defenderLosses);
    }
  }

  const roundByRoundLosses: Record<Phase, RoundLossRow[]> = { naval: [], land: [] };
  const totalLossByType: Record<Side, Record<Phase, SideLossMap>> = {
    attacker: { naval: {}, land: {} },
    defender: { naval: {}, land: {} },
  };
  const weightedRoundSum: Record<Side, Record<Phase, SideLossMap>> = {
    attacker: { naval: {}, land: {} },
    defender: { naval: {}, land: {} },
  };

  for (const phase of PHASES) {
    const rounds = [...buckets[phase].keys()].sort((a, b) => a - b);
    for (const round of rounds) {
      const bucket = buckets[phase].get(round);
      if (!bucket) continue;
      const attackerRow: UnitLossCounts = {};
      const defenderRow: UnitLossCounts = {};

      for (const [type, count] of Object.entries(bucket.attacker) as [UnitType, number][]) {
        attackerRow[type] = count / trialsRun;
        totalLossByType.attacker[phase][type] = (totalLossByType.attacker[phase][type] ?? 0) + count;
        weightedRoundSum.attacker[phase][type] =
          (weightedRoundSum.attacker[phase][type] ?? 0) + count * round;
      }
      for (const [type, count] of Object.entries(bucket.defender) as [UnitType, number][]) {
        defenderRow[type] = count / trialsRun;
        totalLossByType.defender[phase][type] = (totalLossByType.defender[phase][type] ?? 0) + count;
        weightedRoundSum.defender[phase][type] =
          (weightedRoundSum.defender[phase][type] ?? 0) + count * round;
      }

      roundByRoundLosses[phase].push({ round, attackerLosses: attackerRow, defenderLosses: defenderRow });
    }
  }

  const deathOrder: AggregatedResult['deathOrder'] = {
    attacker: { naval: [], land: [] },
    defender: { naval: [], land: [] },
  };

  for (const side of SIDES) {
    for (const phase of PHASES) {
      const entries: DeathOrderEntry[] = [];
      const totals = totalLossByType[side][phase];
      const weighted = weightedRoundSum[side][phase];
      for (const type of Object.keys(totals) as UnitType[]) {
        const totalLosses = totals[type] ?? 0;
        if (totalLosses <= 0) continue;
        entries.push({ unitType: type, avgDeathRound: (weighted[type] ?? 0) / totalLosses });
      }
      entries.sort((a, b) => a.avgDeathRound - b.avgDeathRound);
      deathOrder[side][phase] = entries;
    }
  }

  const totalIpcLoss = { attacker: 0, defender: 0 };
  for (const side of SIDES) {
    let total = 0;
    for (const phase of PHASES) {
      for (const [type, count] of Object.entries(totalLossByType[side][phase]) as [UnitType, number][]) {
        total += catalog[type].cost * count;
      }
    }
    totalIpcLoss[side] = total / trialsRun;
  }

  const perTrialAverage = (totals: SideLossMap): UnitLossCounts => {
    const averaged: UnitLossCounts = {};
    for (const [type, count] of Object.entries(totals) as [UnitType, number][]) {
      averaged[type] = count / trialsRun;
    }
    return averaged;
  };

  return {
    trialsRun,
    attackerWinPct: (attackerWins / trialsRun) * 100,
    defenderWinPct: (defenderWins / trialsRun) * 100,
    tiePct: (ties / trialsRun) * 100,
    standoffPct: (standoffs / trialsRun) * 100,
    clearedNotCapturedPct: (clearedNotCaptured / trialsRun) * 100,
    deathOrder,
    roundByRoundLosses,
    totalIpcLoss,
    aaLosses: perTrialAverage(aaTotals),
    bombardmentLosses: perTrialAverage(bombardmentTotals),
  };
}
