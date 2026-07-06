import { detectBattleContext } from './battleDetection';
import { resolveRound } from './combatRound';
import { ROUND_CAP } from './constants';
import { resolveAAFire, resolveBombardment } from './specialPhases';
import { ALL_UNIT_TYPES } from './types';
import type {
  ArmyComposition,
  BattleInput,
  Domain,
  Phase,
  RoundOutcome,
  Side,
  TrialOutcome,
  TrialResult,
  UnitDefinition,
  UnitInstance,
  UnitLossCounts,
  UnitType,
} from './types';
import type { Rng } from './rng';

function isAlive(unit: UnitInstance, catalog: Record<UnitType, UnitDefinition>): boolean {
  return unit.hitsTaken < catalog[unit.type].hitsToDestroy;
}

/**
 * Whether this side still has a unit capable of continuing/winning the
 * fight. AA guns are deliberately excluded: they can never be selected as a
 * casualty (so they'd never naturally die) but also can't hold a territory
 * or fight back on their own — without this exclusion, a defender reduced to
 * "AA gun only" would stall combat forever instead of losing.
 */
function hasFightingUnits(units: UnitInstance[], catalog: Record<UnitType, UnitDefinition>): boolean {
  return units.some((u) => isAlive(u, catalog) && !catalog[u.type].isAAGun);
}

function tally(units: UnitInstance[]): UnitLossCounts {
  const counts: UnitLossCounts = {};
  for (const u of units) {
    counts[u.type] = (counts[u.type] ?? 0) + 1;
  }
  return counts;
}

let nextUnitId = 0;

function expandArmy(
  composition: ArmyComposition,
  side: Side,
  domainFilter: (d: Domain) => boolean,
  catalog: Record<UnitType, UnitDefinition>,
): UnitInstance[] {
  const units: UnitInstance[] = [];
  for (const type of ALL_UNIT_TYPES) {
    const def = catalog[type];
    if (!domainFilter(def.domain)) continue;
    const count = composition[type] ?? 0;
    for (let i = 0; i < count; i++) {
      units.push({ id: nextUnitId++, type, side, domain: def.domain, hitsTaken: 0 });
    }
  }
  return units;
}

/**
 * Runs rounds of `phase` combat until one side (or both) is wiped out or the
 * safety-valve round cap is hit. Pushes a RoundOutcome per round into
 * `rounds`. If `condemnedAfterRound1` is given (amphibious bombardment
 * casualties), those units are force-finalized after round 1 resolves —
 * they still fight that round, but are guaranteed removal afterward
 * regardless of what round 1 itself did to them.
 */
function runPhaseRounds(
  attackerUnits: UnitInstance[],
  defenderUnits: UnitInstance[],
  phase: Phase,
  input: BattleInput,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng,
  rounds: RoundOutcome[],
  condemnedAfterRound1: UnitInstance[] = [],
): { attackerSurvived: boolean; defenderSurvived: boolean } {
  let round = 1;
  while (round <= ROUND_CAP) {
    const attackerAlive = hasFightingUnits(attackerUnits, catalog);
    const defenderAlive = hasFightingUnits(defenderUnits, catalog);
    if (!attackerAlive || !defenderAlive) break;

    const result = resolveRound(attackerUnits, defenderUnits, phase, input.priorityMode, catalog, rng);
    const attackerLossUnits = [...result.attackerDestroyed];
    const defenderLossUnits = [...result.defenderDestroyed];

    if (round === 1 && condemnedAfterRound1.length > 0) {
      for (const unit of condemnedAfterRound1) {
        if (isAlive(unit, catalog)) {
          unit.hitsTaken = catalog[unit.type].hitsToDestroy;
          defenderLossUnits.push(unit);
        }
      }
    }

    rounds.push({
      phase,
      round,
      attackerLosses: tally(attackerLossUnits),
      defenderLosses: tally(defenderLossUnits),
    });
    round++;
  }

  if (round > ROUND_CAP) {
    // eslint-disable-next-line no-console
    console.warn(`${phase} phase hit the ${ROUND_CAP}-round safety cap without resolving.`);
  }

  return {
    attackerSurvived: hasFightingUnits(attackerUnits, catalog),
    defenderSurvived: hasFightingUnits(defenderUnits, catalog),
  };
}

/** Runs one full Monte Carlo trial of a battle from start to finish. */
export function runTrial(
  input: BattleInput,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng,
): TrialResult {
  const context = detectBattleContext(input.attacker, input.defender);
  const rounds: RoundOutcome[] = [];

  let attackerNaval: UnitInstance[] = [];
  let defenderNaval: UnitInstance[] = [];
  let attackerLand: UnitInstance[] = [];
  let defenderLand: UnitInstance[] = [];

  if (context.type === 'naval') {
    // No invasion is happening — sea + air units on both sides fight it out,
    // land units (and the AA gun) on either side sit out entirely.
    attackerNaval = expandArmy(input.attacker, 'attacker', (d) => d === 'sea' || d === 'air', catalog);
    defenderNaval = expandArmy(input.defender, 'defender', (d) => d === 'sea' || d === 'air', catalog);
  } else if (context.type === 'amphibious') {
    attackerNaval = expandArmy(input.attacker, 'attacker', (d) => d === 'sea', catalog);
    defenderNaval = context.navalPhaseOccurs
      ? expandArmy(input.defender, 'defender', (d) => d === 'sea', catalog)
      : [];
    attackerLand = expandArmy(input.attacker, 'attacker', (d) => d === 'land' || d === 'air', catalog);
    defenderLand = expandArmy(input.defender, 'defender', (d) => d === 'land' || d === 'air', catalog);
  } else {
    attackerLand = expandArmy(input.attacker, 'attacker', (d) => d === 'land' || d === 'air', catalog);
    defenderLand = expandArmy(input.defender, 'defender', (d) => d === 'land' || d === 'air', catalog);
  }

  let outcome: TrialOutcome;

  if (context.type === 'naval') {
    const { attackerSurvived, defenderSurvived } = runPhaseRounds(
      attackerNaval,
      defenderNaval,
      'naval',
      input,
      catalog,
      rng,
      rounds,
    );
    outcome = attackerSurvived === defenderSurvived
      ? 'tie'
      : attackerSurvived
        ? 'attackerWins'
        : 'defenderWins';
  } else {
    // Amphibious: resolve the naval phase first (if it's actually contested)
    // to determine whether the sea zone is clear for the landing.
    let seaZoneClear = true;
    let survivingAttackerNaval = attackerNaval;

    if (context.type === 'amphibious' && context.navalPhaseOccurs) {
      const { attackerSurvived, defenderSurvived } = runPhaseRounds(
        attackerNaval,
        defenderNaval,
        'naval',
        input,
        catalog,
        rng,
        rounds,
      );
      // The zone is clear once the defender's fleet is gone — it doesn't
      // matter whether the attacker's fleet also perished (a naval "tie"
      // still leaves nothing behind to contest the landing).
      seaZoneClear = !defenderSurvived;
      survivingAttackerNaval = attackerSurvived
        ? attackerNaval.filter((u) => isAlive(u, catalog))
        : [];
    }

    if (context.type === 'amphibious' && !seaZoneClear) {
      // The defender still holds the sea zone — transports can't unload,
      // the assault never launches.
      outcome = 'defenderWins';
    } else {
      const aa = resolveAAFire(attackerLand, defenderLand, input.priorityMode, catalog, rng);
      if (aa.attackerDestroyed.length > 0) {
        rounds.push({
          phase: 'land',
          round: 0,
          attackerLosses: tally(aa.attackerDestroyed),
          defenderLosses: {},
        });
      }

      let condemned: UnitInstance[] = [];
      if (context.type === 'amphibious') {
        condemned = resolveBombardment(
          survivingAttackerNaval,
          defenderLand,
          input.priorityMode,
          catalog,
          rng,
        ).condemned;
      }

      const { attackerSurvived, defenderSurvived } = runPhaseRounds(
        attackerLand,
        defenderLand,
        'land',
        input,
        catalog,
        rng,
        rounds,
        condemned,
      );

      outcome = attackerSurvived === defenderSurvived
        ? 'tie'
        : attackerSurvived
          ? 'attackerWins'
          : 'defenderWins';
    }
  }

  return { outcome, rounds };
}
