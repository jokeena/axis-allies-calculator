import { hasFightingUnits, resolvePhaseOutcome, runPhaseRounds } from './battleSequencer';
import {
  ELIMINATION_EPSILON,
  applyExpectedHits,
  makeForce,
  runExpectedCombat,
  sacrificeOrder,
  snapshot,
  totalUnits,
} from './expectedBattle';
import { resolveAAFire, resolveBombardment } from './specialPhases';
import { defaultRng } from './rng';
import type {
  PriorityMode,
  RoundOutcome,
  Side,
  TrialOutcome,
  UnitDefinition,
  UnitInstance,
  UnitLossCounts,
  UnitType,
} from './types';
import type { ExpectedRound } from './expectedBattle';
import type { Rng } from './rng';

/**
 * Multi-stage amphibious assault:
 *
 *   1. Sea battle — the attacker's committed warships, sea-assigned planes,
 *      and loaded transports fight the defender's fleet (plus carrier-based
 *      defending fighters). Held-back cover-shot ships never participate
 *      and can never be hit.
 *   2. The attacker controls the sea zone by WINNING or TYING (mutual
 *      annihilation still clears it — held-back ships weren't in the fight).
 *   3. If controlled: cover-shot ships bombard (instant kills), surviving
 *      transports unload, and the landing force fights the land battle.
 *      If NOT controlled: the land battle still happens with the
 *      adjacent-territory troops and landing-assigned planes only — every
 *      ship goes inert, nothing lands, no cover fire.
 *
 * Sunk transports take their cargo down with them. Cargo rule (house):
 * each transport carries 2 infantry OR 1 artillery OR 1 tank — no mixing.
 */
export interface AmphibiousInput {
  attacker: {
    /** Warships committed to the sea battle: submarine/destroyer/battleship/carrier. */
    seaFleet: UnitLossCounts;
    /** Planes assigned to the sea battle: fighter/bomber. */
    seaPlanes: UnitLossCounts;
    /** Transports entering the sea battle. */
    seaTransports: number;
    /** Troops embarked on the sea-battle transports: infantry/artillery/armor. */
    seaCargo: UnitLossCounts;
    /** Of the sea-battle transports, this many are sacrificed last — only
     * lost once every other ship in the sea battle is already sunk. */
    preserveTransports: number;
    /** Transports that skip the sea battle entirely — untouchable, and they
     * still unload if the zone ends up controlled. */
    heldBackTransports: number;
    /** Troops embarked on the held-back transports: infantry/artillery/armor. */
    heldBackCargo: UnitLossCounts;
    /** Held-back battleships/destroyers — cover shots only, untouchable. */
    coverShips: UnitLossCounts;
    /** Troops attacking from an adjacent territory: infantry/artillery/armor. */
    landTroops: UnitLossCounts;
    /** Planes assigned to the landing: fighter/bomber. */
    landPlanes: UnitLossCounts;
  };
  defender: {
    /** Fleet defending the sea zone: transport/submarine/destroyer/battleship/carrier. */
    seaFleet: UnitLossCounts;
    /** Carrier-based fighters defending the sea zone (max 2 per carrier). */
    seaFighters: number;
    /** Territory garrison: infantry/artillery/armor/aaGun. */
    landForce: UnitLossCounts;
    /** Planes defending the territory: fighter/bomber. */
    landPlanes: UnitLossCounts;
  };
  priorityMode: PriorityMode;
  ensureCapture: boolean;
  trialCount: number;
}

export interface AmphibiousStage {
  attackerStart: UnitLossCounts;
  defenderStart: UnitLossCounts;
  rounds: ExpectedRound[];
  attackerSurvivors: UnitLossCounts;
  defenderSurvivors: UnitLossCounts;
}

export interface AmphibiousExpected {
  /** Null when the defender has no fleet (the zone starts clear). */
  sea: AmphibiousStage | null;
  seaControlled: boolean;
  /** Cargo that went down with sunk transports. */
  cargoLost: UnitLossCounts;
  land: AmphibiousStage;
  aaLosses: UnitLossCounts;
  bombardmentLosses: UnitLossCounts;
}

export interface AmphibiousSimulation {
  trialsRun: number;
  /** % of trials where the attacker cleared the sea zone (win or tie). */
  seaControlledPct: number;
  attackerWinPct: number;
  defenderWinPct: number;
  tiePct: number;
  standoffPct: number;
  clearedNotCapturedPct: number;
  totalIpcLoss: { attacker: number; defender: number };
}

export interface AmphibiousResult {
  simulation: AmphibiousSimulation;
  expected: AmphibiousExpected;
}

type Catalog = Record<UnitType, UnitDefinition>;

function mergeCounts(...sources: UnitLossCounts[]): UnitLossCounts {
  const out: UnitLossCounts = {};
  for (const source of sources) {
    for (const [type, count] of Object.entries(source) as [UnitType, number][]) {
      if (count > 0) out[type] = (out[type] ?? 0) + count;
    }
  }
  return out;
}

/** Boats needed under the strict cargo rule: 2 inf OR 1 artillery OR 1 tank. */
export function transportsNeeded(cargo: UnitLossCounts): number {
  return Math.ceil((cargo.infantry ?? 0) / 2) + (cargo.artillery ?? 0) + (cargo.armor ?? 0);
}

/** Human-readable validation problems, or an empty list when the input is sound. */
export function amphibiousValidationErrors(input: AmphibiousInput): string[] {
  const errors: string[] = [];
  const seaNeeded = transportsNeeded(input.attacker.seaCargo);
  if (seaNeeded > input.attacker.seaTransports) {
    errors.push(
      `The embarked troops need ${seaNeeded} sea-battle transports (2 infantry OR 1 artillery OR 1 tank per boat) — only ${input.attacker.seaTransports} provided.`,
    );
  }
  const heldBackNeeded = transportsNeeded(input.attacker.heldBackCargo);
  if (heldBackNeeded > input.attacker.heldBackTransports) {
    errors.push(
      `The held-back troops need ${heldBackNeeded} held-back transports (2 infantry OR 1 artillery OR 1 tank per boat) — only ${input.attacker.heldBackTransports} provided.`,
    );
  }
  if (input.attacker.preserveTransports > input.attacker.seaTransports) {
    errors.push(
      `Preserved transports (${input.attacker.preserveTransports}) can't exceed the ${input.attacker.seaTransports} transport${input.attacker.seaTransports === 1 ? '' : 's'} actually entering the sea battle.`,
    );
  }
  const fighterCap = 2 * (input.defender.seaFleet.carrier ?? 0);
  if (input.defender.seaFighters > fighterCap) {
    errors.push(
      `Defending sea fighters are carrier-based: max ${fighterCap} with ${input.defender.seaFleet.carrier ?? 0} carrier${(input.defender.seaFleet.carrier ?? 0) === 1 ? '' : 's'} (2 per carrier).`,
    );
  }
  return errors;
}

/**
 * Cargo manifest per boat, ordered by sacrifice priority: empty boats die
 * first, then half-loaded infantry boats, full infantry boats, artillery
 * boats, and tank boats last.
 */
export function buildBoatManifest(transports: number, cargo: UnitLossCounts): UnitLossCounts[] {
  const boats: UnitLossCounts[] = [];
  const infantry = cargo.infantry ?? 0;
  const fullInfBoats = Math.floor(infantry / 2);
  const halfInfBoat = infantry % 2 === 1;
  const usedBoats =
    fullInfBoats + (halfInfBoat ? 1 : 0) + (cargo.artillery ?? 0) + (cargo.armor ?? 0);

  for (let i = 0; i < transports - usedBoats; i++) boats.push({});
  if (halfInfBoat) boats.push({ infantry: 1 });
  for (let i = 0; i < fullInfBoats; i++) boats.push({ infantry: 2 });
  for (let i = 0; i < (cargo.artillery ?? 0); i++) boats.push({ artillery: 1 });
  for (let i = 0; i < (cargo.armor ?? 0); i++) boats.push({ armor: 1 });
  return boats;
}

/** Cargo lost when the first `boatsLost` boats (fractional allowed) go down. */
function manifestLoss(manifest: UnitLossCounts[], boatsLost: number): UnitLossCounts {
  const lost: UnitLossCounts = {};
  let remaining = boatsLost;
  for (const boat of manifest) {
    if (remaining <= 0) break;
    const fraction = Math.min(1, remaining);
    for (const [type, count] of Object.entries(boat) as [UnitType, number][]) {
      lost[type] = (lost[type] ?? 0) + count * fraction;
    }
    remaining -= fraction;
  }
  return lost;
}

let unitIdCounter = 0;

function makeUnits(
  counts: UnitLossCounts,
  side: Side,
  catalog: Catalog,
  protectedCounts: UnitLossCounts = {},
): UnitInstance[] {
  const units: UnitInstance[] = [];
  for (const [type, count] of Object.entries(counts) as [UnitType, number][]) {
    const protectedForType = protectedCounts[type] ?? 0;
    for (let i = 0; i < count; i++) {
      units.push({
        id: unitIdCounter++,
        type,
        side,
        domain: catalog[type].domain,
        hitsTaken: 0,
        protected: i < protectedForType,
      });
    }
  }
  return units;
}

function isAlive(unit: UnitInstance, catalog: Catalog): boolean {
  return unit.hitsTaken < catalog[unit.type].hitsToDestroy;
}

function deadIpc(units: UnitInstance[], catalog: Catalog): number {
  return units.reduce((sum, u) => sum + (isAlive(u, catalog) ? 0 : catalog[u.type].cost), 0);
}

function countsIpc(counts: UnitLossCounts, catalog: Catalog): number {
  return (Object.entries(counts) as [UnitType, number][]).reduce(
    (sum, [type, count]) => sum + catalog[type].cost * count,
    0,
  );
}

function subtractCounts(base: UnitLossCounts, minus: UnitLossCounts): UnitLossCounts {
  const out: UnitLossCounts = {};
  for (const [type, count] of Object.entries(base) as [UnitType, number][]) {
    const remaining = count - (minus[type] ?? 0);
    if (remaining > 1e-9) out[type] = remaining;
  }
  return out;
}

interface TrialOutcomeRecord {
  seaControlled: boolean;
  outcome: TrialOutcome;
  attackerIpcLost: number;
  defenderIpcLost: number;
}

function runAmphibiousTrial(
  input: AmphibiousInput,
  manifest: UnitLossCounts[],
  catalog: Catalog,
  rng: Rng,
): TrialOutcomeRecord {
  const mode = input.priorityMode;
  const throwaway: RoundOutcome[] = [];

  // --- Stage 1: the sea battle ---
  const attackerSea = makeUnits(
    mergeCounts(input.attacker.seaFleet, input.attacker.seaPlanes, {
      transport: input.attacker.seaTransports,
    }),
    'attacker',
    catalog,
    { transport: input.attacker.preserveTransports },
  );
  const defenderSea = makeUnits(
    mergeCounts(input.defender.seaFleet, { fighter: input.defender.seaFighters }),
    'defender',
    catalog,
  );

  let seaControlled: boolean;
  if (defenderSea.length === 0) {
    seaControlled = true;
  } else if (!hasFightingUnits(attackerSea, catalog)) {
    seaControlled = false;
  } else {
    const seaResult = runPhaseRounds(
      attackerSea,
      defenderSea,
      'naval',
      mode,
      false,
      catalog,
      rng,
      throwaway,
    );
    // Win or mutual annihilation clears the zone; a loss or standoff
    // leaves the defender's fleet in place.
    seaControlled = !seaResult.defenderSurvived;
  }

  const transportsLost = attackerSea.filter(
    (u) => u.type === 'transport' && !isAlive(u, catalog),
  ).length;
  const cargoLost = manifestLoss(manifest, transportsLost);

  // --- Stage 2: the land battle ---
  const landedCargo = seaControlled
    ? mergeCounts(subtractCounts(input.attacker.seaCargo, cargoLost), input.attacker.heldBackCargo)
    : {};
  const attackerLand = makeUnits(
    mergeCounts(input.attacker.landTroops, input.attacker.landPlanes, landedCargo),
    'attacker',
    catalog,
  );
  const defenderLand = makeUnits(
    mergeCounts(input.defender.landForce, input.defender.landPlanes),
    'defender',
    catalog,
  );

  resolveAAFire(attackerLand, defenderLand, mode, catalog, rng);

  if (seaControlled) {
    const coverShips = makeUnits(input.attacker.coverShips, 'attacker', catalog).filter(
      (u) => catalog[u.type].bombard,
    );
    if (coverShips.length > 0) {
      resolveBombardment(coverShips, defenderLand, mode, catalog, rng);
    }
  }

  const landResult = runPhaseRounds(
    attackerLand,
    defenderLand,
    'land',
    mode,
    input.ensureCapture,
    catalog,
    rng,
    throwaway,
  );
  let outcome = resolvePhaseOutcome(landResult);
  if (outcome === 'attackerWins' && input.ensureCapture) {
    const hasLandSurvivor = attackerLand.some(
      (u) => isAlive(u, catalog) && catalog[u.type].domain === 'land',
    );
    if (!hasLandSurvivor) outcome = 'clearedNotCaptured';
  }

  return {
    seaControlled,
    outcome,
    attackerIpcLost:
      deadIpc(attackerSea, catalog) + countsIpc(cargoLost, catalog) + deadIpc(attackerLand, catalog),
    defenderIpcLost: deadIpc(defenderSea, catalog) + deadIpc(defenderLand, catalog),
  };
}

/** Deterministic expected-value chain for the force report. */
export function runExpectedAmphibious(
  input: AmphibiousInput,
  catalog: Catalog,
): AmphibiousExpected {
  const mode = input.priorityMode;
  const allDomains: Array<'land' | 'air' | 'sea'> = ['land', 'air', 'sea'];

  const preserveTransports = input.attacker.preserveTransports;
  const attackerSeaCounts = mergeCounts(input.attacker.seaFleet, input.attacker.seaPlanes, {
    transport: input.attacker.seaTransports,
  });
  const defenderSeaCounts = mergeCounts(input.defender.seaFleet, {
    fighter: input.defender.seaFighters,
  });

  let sea: AmphibiousStage | null = null;
  let seaControlled = true;
  let transportsLost = 0;

  if (totalUnits(makeForce(defenderSeaCounts, allDomains, catalog)) > 0) {
    const attackerSea = makeForce(attackerSeaCounts, allDomains, catalog);
    const defenderSea = makeForce(defenderSeaCounts, allDomains, catalog);
    const attackerStart = snapshot(attackerSea);
    const defenderStart = snapshot(defenderSea);
    const rounds: ExpectedRound[] = [];

    if (totalUnits(attackerSea) > 0) {
      runExpectedCombat(
        attackerSea,
        defenderSea,
        'naval',
        mode,
        false,
        catalog,
        rounds,
        preserveTransports > 0 ? { type: 'transport', amount: preserveTransports } : undefined,
      );
    }
    seaControlled = totalUnits(defenderSea) < ELIMINATION_EPSILON;
    transportsLost = (attackerStart.transport ?? 0) - (snapshot(attackerSea).transport ?? 0);

    sea = {
      attackerStart,
      defenderStart,
      rounds,
      attackerSurvivors: snapshot(attackerSea),
      defenderSurvivors: snapshot(defenderSea),
    };
  }

  const manifest = buildBoatManifest(input.attacker.seaTransports, input.attacker.seaCargo);
  const cargoLost = manifestLoss(manifest, transportsLost);

  // --- Land stage ---
  const landedCargo = seaControlled
    ? mergeCounts(subtractCounts(input.attacker.seaCargo, cargoLost), input.attacker.heldBackCargo)
    : {};
  const attackerLand = makeForce(
    mergeCounts(input.attacker.landTroops, input.attacker.landPlanes, landedCargo),
    allDomains,
    catalog,
  );
  const defenderLand = makeForce(
    mergeCounts(input.defender.landForce, input.defender.landPlanes),
    allDomains,
    catalog,
  );
  const landAttackerStart = snapshot(attackerLand);
  const landDefenderStart = snapshot(defenderLand);

  const aaLosses: UnitLossCounts = {};
  if ((input.defender.landForce.aaGun ?? 0) > 0) {
    const planes = (attackerLand.counts.fighter ?? 0) + (attackerLand.counts.bomber ?? 0);
    if (planes > 0) {
      const order = sacrificeOrder('attacker', attackerLand.types, mode, catalog);
      applyExpectedHits(attackerLand, planes / 6, order, catalog, aaLosses, { onlyAir: true });
    }
  }

  const bombardmentLosses: UnitLossCounts = {};
  if (seaControlled) {
    const pool =
      ((input.attacker.coverShips.battleship ?? 0) * 4 +
        (input.attacker.coverShips.destroyer ?? 0) * 3) /
      6;
    if (pool > 0) {
      const order = sacrificeOrder('defender', defenderLand.types, mode, catalog);
      applyExpectedHits(defenderLand, pool, order, catalog, bombardmentLosses, {});
    }
  }

  const landRounds: ExpectedRound[] = [];
  runExpectedCombat(attackerLand, defenderLand, 'land', mode, input.ensureCapture, catalog, landRounds);

  return {
    sea,
    seaControlled,
    cargoLost,
    land: {
      attackerStart: landAttackerStart,
      defenderStart: landDefenderStart,
      rounds: landRounds,
      attackerSurvivors: snapshot(attackerLand),
      defenderSurvivors: snapshot(defenderLand),
    },
    aaLosses,
    bombardmentLosses,
  };
}

/** Public entry point: Monte Carlo odds plus the expected-value chain. */
export function runAmphibiousCalculation(
  input: AmphibiousInput,
  catalog: Catalog,
  rng: Rng = defaultRng,
): AmphibiousResult {
  const manifest = buildBoatManifest(input.attacker.seaTransports, input.attacker.seaCargo);

  let seaControlled = 0;
  let attackerWins = 0;
  let defenderWins = 0;
  let ties = 0;
  let standoffs = 0;
  let clearedNotCaptured = 0;
  let attackerIpc = 0;
  let defenderIpc = 0;

  for (let i = 0; i < input.trialCount; i++) {
    const trial = runAmphibiousTrial(input, manifest, catalog, rng);
    if (trial.seaControlled) seaControlled++;
    if (trial.outcome === 'attackerWins') attackerWins++;
    else if (trial.outcome === 'defenderWins') defenderWins++;
    else if (trial.outcome === 'standoff') standoffs++;
    else if (trial.outcome === 'clearedNotCaptured') clearedNotCaptured++;
    else ties++;
    attackerIpc += trial.attackerIpcLost;
    defenderIpc += trial.defenderIpcLost;
  }

  const n = input.trialCount;
  return {
    simulation: {
      trialsRun: n,
      seaControlledPct: (seaControlled / n) * 100,
      attackerWinPct: (attackerWins / n) * 100,
      defenderWinPct: (defenderWins / n) * 100,
      tiePct: (ties / n) * 100,
      standoffPct: (standoffs / n) * 100,
      clearedNotCapturedPct: (clearedNotCaptured / n) * 100,
      totalIpcLoss: { attacker: attackerIpc / n, defender: defenderIpc / n },
    },
    expected: runExpectedAmphibious(input, catalog),
  };
}
