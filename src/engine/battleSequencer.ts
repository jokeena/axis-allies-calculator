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

/**
 * Whether `units` can ever score a hit against `opponents`, given the
 * air/submarine restrictions. When NEITHER side can, the battle is a
 * standoff and ends immediately (per the rulebook: if only submarines and
 * aircraft remain and no destroyer is present, the battle is over — they
 * cannot attack each other).
 */
function sideCanHit(
  units: UnitInstance[],
  opponents: UnitInstance[],
  phase: Phase,
  isAttacker: boolean,
  catalog: Record<UnitType, UnitDefinition>,
): boolean {
  const oppAlive = opponents.filter((u) => isAlive(u, catalog));
  if (oppAlive.length === 0) return false;
  const oppHasNonAir = oppAlive.some((u) => catalog[u.type].domain !== 'air');
  const oppHasNonSub = oppAlive.some((u) => u.type !== 'submarine');
  const hasDestroyer = units.some((u) => u.type === 'destroyer' && isAlive(u, catalog));

  for (const unit of units) {
    if (!isAlive(unit, catalog)) continue;
    const def = catalog[unit.type];
    if (def.isAAGun) continue;
    const value = isAttacker ? def.attack : def.defense;
    if (value <= 0) continue;
    if (unit.type === 'submarine') {
      if (oppHasNonAir) return true;
      continue;
    }
    if (def.domain === 'air' && phase === 'naval') {
      if (oppHasNonSub || hasDestroyer) return true;
      continue;
    }
    return true;
  }
  return false;
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

interface PhaseResult {
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  /** True when the phase ended because neither side could ever hit the other. */
  standoff: boolean;
}

/**
 * Runs rounds of `phase` combat until one side (or both) is wiped out, a
 * standoff is detected, or the safety-valve round cap is hit. Pushes a
 * RoundOutcome per round into `rounds`. If `condemnedAfterRound1` is given
 * (amphibious bombardment casualties), those units are force-finalized after
 * round 1 resolves — they still fight that round, but are guaranteed removal
 * afterward; units actually finalized here are also pushed into
 * `bombardmentKills` so the trial can attribute them to cover shots.
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
  bombardmentKills: UnitInstance[] = [],
): PhaseResult {
  const protectAttackerLand = phase === 'land' && input.ensureCapture;
  let standoff = false;
  let round = 1;
  while (round <= ROUND_CAP) {
    const attackerAlive = hasFightingUnits(attackerUnits, catalog);
    const defenderAlive = hasFightingUnits(defenderUnits, catalog);
    if (!attackerAlive || !defenderAlive) break;

    if (
      !sideCanHit(attackerUnits, defenderUnits, phase, true, catalog) &&
      !sideCanHit(defenderUnits, attackerUnits, phase, false, catalog)
    ) {
      standoff = true;
      break;
    }

    const result = resolveRound(
      attackerUnits,
      defenderUnits,
      phase,
      input.priorityMode,
      catalog,
      rng,
      protectAttackerLand,
    );
    const attackerLossUnits = [...result.attackerDestroyed];
    const defenderLossUnits = [...result.defenderDestroyed];

    if (round === 1 && condemnedAfterRound1.length > 0) {
      for (const unit of condemnedAfterRound1) {
        if (isAlive(unit, catalog)) {
          unit.hitsTaken = catalog[unit.type].hitsToDestroy;
          defenderLossUnits.push(unit);
          bombardmentKills.push(unit);
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
    standoff,
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
  let aaLosses: UnitLossCounts = {};
  const bombardmentKills: UnitInstance[] = [];

  let outcome: TrialOutcome;

  if (context.type === 'naval') {
    // Pure sea battle: ships and planes on both sides fight it out. Land
    // units and AA guns (there are no land troops by definition here) sit out.
    const attackerNaval = expandArmy(input.attacker, 'attacker', (d) => d === 'sea' || d === 'air', catalog);
    const defenderNaval = expandArmy(input.defender, 'defender', (d) => d === 'sea' || d === 'air', catalog);
    const phaseResult = runPhaseRounds(attackerNaval, defenderNaval, 'naval', input, catalog, rng, rounds);
    outcome = resolvePhaseOutcome(phaseResult);
  } else {
    // Land battle: land troops and aircraft fight. Ships never fight or die
    // here — the attacker's battleships/destroyers only contribute one-shot
    // bombardment cover fire before round 1.
    const attackerLand = expandArmy(input.attacker, 'attacker', (d) => d === 'land' || d === 'air', catalog);
    const defenderLand = expandArmy(input.defender, 'defender', (d) => d === 'land' || d === 'air', catalog);

    const aa = resolveAAFire(attackerLand, defenderLand, input.priorityMode, catalog, rng);
    if (aa.attackerDestroyed.length > 0) {
      aaLosses = tally(aa.attackerDestroyed);
      rounds.push({
        phase: 'land',
        round: 0,
        attackerLosses: aaLosses,
        defenderLosses: {},
      });
    }

    let condemned: UnitInstance[] = [];
    if (context.bombardmentSupport) {
      const supportShips = expandArmy(input.attacker, 'attacker', (d) => d === 'sea', catalog).filter(
        (u) => catalog[u.type].bombard,
      );
      condemned = resolveBombardment(supportShips, defenderLand, input.priorityMode, catalog, rng)
        .condemned;
    }

    const phaseResult = runPhaseRounds(
      attackerLand,
      defenderLand,
      'land',
      input,
      catalog,
      rng,
      rounds,
      condemned,
      bombardmentKills,
    );

    outcome = resolvePhaseOutcome(phaseResult);
    if (outcome === 'attackerWins' && input.ensureCapture) {
      const hasLandSurvivor = attackerLand.some(
        (u) => isAlive(u, catalog) && catalog[u.type].domain === 'land',
      );
      if (!hasLandSurvivor) {
        outcome = 'clearedNotCaptured';
      }
    }
  }

  return { outcome, rounds, aaLosses, bombardmentLosses: tally(bombardmentKills) };
}

function resolvePhaseOutcome(result: PhaseResult): TrialOutcome {
  if (result.attackerSurvived && result.defenderSurvived) {
    return result.standoff ? 'standoff' : 'tie';
  }
  if (!result.attackerSurvived && !result.defenderSurvived) return 'tie';
  return result.attackerSurvived ? 'attackerWins' : 'defenderWins';
}
