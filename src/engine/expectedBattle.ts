import { detectBattleContext } from './battleDetection';
import { ALL_UNIT_TYPES } from './types';
import type {
  BattleInput,
  Phase,
  PriorityMode,
  Side,
  UnitDefinition,
  UnitLossCounts,
  UnitType,
} from './types';

/**
 * Deterministic expected-value battle, used for the survivors/casualties
 * and round-by-round displays (NOT the win odds — those stay Monte Carlo).
 *
 * Each unit deals its average damage per round (an attacking infantry deals
 * 1/6 of a hit, not a 1/6 chance of one hit), and casualties drain in the
 * doctrine's exact sacrifice order — so the weakest units are fully
 * exhausted before stronger ones take any damage, instead of every type
 * being smeared with a fractional average the way per-trial simulation
 * results are.
 */
export interface ExpectedRound {
  round: number;
  attacker: UnitLossCounts;
  defender: UnitLossCounts;
}

export interface ExpectedBattleResult {
  phase: Phase;
  attackerStart: UnitLossCounts;
  defenderStart: UnitLossCounts;
  /** Remaining forces after each combat round (pre-battle AA fire and
   * bombardment strikes are reported via aaLosses/bombardmentLosses). */
  rounds: ExpectedRound[];
  attackerSurvivors: UnitLossCounts;
  defenderSurvivors: UnitLossCounts;
  /** Attacker aircraft downed by pre-battle AA fire — instant kills. */
  aaLosses: UnitLossCounts;
  /** Defenders killed by pre-battle bombardment cover shots — instant kills,
   * applied to the fresh force so the weakest units always fall first. */
  bombardmentLosses: UnitLossCounts;
}

type Catalog = Record<UnitType, UnitDefinition>;

/** A fractional destroyer below this counts as absent for the sub/air rules. */
const PRESENCE_EPSILON = 0.01;
/** A side whose total force drops below this is considered destroyed. */
const ELIMINATION_EPSILON = 0.05;
/** Combined losses per round below this = the grind has effectively stopped. */
const STALL_EPSILON = 0.005;
const MAX_ROUNDS = 200;

interface Force {
  types: UnitType[];
  counts: Record<string, number>;
  /** Damaged-but-alive battleships (they fight at full strength). */
  battleshipDamaged: number;
}

function makeForce(
  composition: UnitLossCounts,
  domains: Array<'land' | 'air' | 'sea'>,
  catalog: Catalog,
): Force {
  const types = ALL_UNIT_TYPES.filter(
    (t) =>
      !catalog[t].isAAGun && domains.includes(catalog[t].domain) && (composition[t] ?? 0) > 0,
  );
  const counts: Record<string, number> = {};
  for (const t of types) counts[t] = composition[t] ?? 0;
  return { types, counts, battleshipDamaged: 0 };
}

function totalUnits(force: Force): number {
  return force.types.reduce((sum, t) => sum + force.counts[t], 0);
}

function snapshot(force: Force): UnitLossCounts {
  const out: UnitLossCounts = {};
  for (const t of force.types) out[t] = Math.max(0, force.counts[t]);
  return out;
}

function sacrificeOrder(
  side: Side,
  types: UnitType[],
  mode: PriorityMode,
  catalog: Catalog,
): UnitType[] {
  const value = (t: UnitType): number =>
    side === 'attacker' ? catalog[t].attack : catalog[t].defense;
  return [...types].sort((a, b) => {
    if (mode === 'militaristic') {
      return value(a) - value(b) || catalog[a].cost - catalog[b].cost;
    }
    return catalog[a].cost - catalog[b].cost || value(a) - value(b);
  });
}

interface HitOptions {
  excludeAir?: boolean;
  excludeSub?: boolean;
  onlyAir?: boolean;
  protectLastLand?: boolean;
}

/**
 * Applies fractional hits in sacrifice order, mutating the force and
 * recording kills. Mirrors the Monte Carlo casualty rules: undamaged
 * battleships soak hits first, Ensure Capture reserves one land unit for
 * the very end of the queue, and domain restrictions are honored.
 */
function applyExpectedHits(
  force: Force,
  hits: number,
  order: UnitType[],
  catalog: Catalog,
  kills: UnitLossCounts,
  opts: HitOptions = {},
): void {
  if (hits <= 0) return;

  const eligible = order.filter((t) => {
    const def = catalog[t];
    if (opts.onlyAir && def.domain !== 'air') return false;
    if (opts.excludeAir && def.domain === 'air') return false;
    if (opts.excludeSub && t === 'submarine') return false;
    return force.counts[t] !== undefined;
  });

  // Battleship soak: the first hit only damages, and that's always optimal.
  if (!opts.onlyAir && force.counts.battleship !== undefined) {
    const soakCapacity = Math.max(0, force.counts.battleship - force.battleshipDamaged);
    const absorbed = Math.min(hits, soakCapacity);
    force.battleshipDamaged += absorbed;
    hits -= absorbed;
    if (hits <= 0) return;
  }

  // Ensure Capture: reserve one unit of the land type the doctrine keeps
  // longest; it is only sacrificed after everything else (aircraft included).
  let reserveType: UnitType | null = null;
  let reserveAmount = 0;
  if (opts.protectLastLand) {
    for (let i = eligible.length - 1; i >= 0; i--) {
      const t = eligible[i];
      if (catalog[t].domain === 'land' && force.counts[t] > 0) {
        reserveType = t;
        reserveAmount = Math.min(1, force.counts[t]);
        break;
      }
    }
  }

  const drain = (t: UnitType, available: number, hitCostPerUnit: number): void => {
    if (available <= 0 || hits <= 0) return;
    const killed = Math.min(available, hits / hitCostPerUnit);
    force.counts[t] -= killed;
    kills[t] = (kills[t] ?? 0) + killed;
    hits -= killed * hitCostPerUnit;
  };

  const drainType = (t: UnitType, reserved: number): void => {
    if (hits <= 0) return;
    if (t === 'battleship') {
      // Damaged battleships sink for one hit; untouched ones need two.
      const damagedAvailable = Math.min(force.battleshipDamaged, force.counts.battleship - reserved);
      const beforeDamaged = Math.min(damagedAvailable, hits);
      force.battleshipDamaged -= Math.min(beforeDamaged, force.battleshipDamaged);
      drain(t, beforeDamaged, 1);
      const undamaged = Math.max(0, force.counts.battleship - reserved - force.battleshipDamaged);
      drain(t, undamaged, 2);
      return;
    }
    drain(t, force.counts[t] - reserved, 1);
  };

  for (const t of eligible) {
    drainType(t, t === reserveType ? reserveAmount : 0);
    if (hits <= 0) return;
  }
  if (reserveType !== null && hits > 0) {
    drainType(reserveType, 0);
  }
}

interface FirePools {
  sub: number;
  air: number;
  other: number;
}

function firepower(force: Force, side: Side, catalog: Catalog): FirePools {
  const pools: FirePools = { sub: 0, air: 0, other: 0 };
  const infantry = force.counts.infantry ?? 0;
  const artillery = force.counts.artillery ?? 0;
  // Artillery pairing boosts attacking infantry to a 2 (1:1 pairing).
  const boosted = side === 'attacker' ? Math.min(infantry, artillery) : 0;

  for (const t of force.types) {
    const def = catalog[t];
    const count = force.counts[t];
    if (count <= 0) continue;
    let value = side === 'attacker' ? def.attack : def.defense;
    if (value <= 0) continue;
    let power = (count * value) / 6;
    if (t === 'infantry' && boosted > 0 && side === 'attacker') {
      power = (boosted * 2 + (count - boosted) * 1) / 6;
    }
    if (t === 'submarine') pools.sub += power;
    else if (def.domain === 'air') pools.air += power;
    else pools.other += power;
  }
  return pools;
}

function sumCounts(counts: UnitLossCounts): number {
  return Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
}

export function runExpectedBattle(input: BattleInput, catalog: Catalog): ExpectedBattleResult {
  const context = detectBattleContext(input.attacker, input.defender);
  const phase: Phase = context.type;

  const domains: Array<'land' | 'air' | 'sea'> =
    phase === 'naval' ? ['sea', 'air'] : ['land', 'air'];
  const attacker = makeForce(input.attacker, domains, catalog);
  const defender = makeForce(input.defender, domains, catalog);

  const attackerOrder = sacrificeOrder('attacker', attacker.types, input.priorityMode, catalog);
  const defenderOrder = sacrificeOrder('defender', defender.types, input.priorityMode, catalog);

  const result: ExpectedBattleResult = {
    phase,
    attackerStart: snapshot(attacker),
    defenderStart: snapshot(defender),
    rounds: [],
    attackerSurvivors: {},
    defenderSurvivors: {},
    aaLosses: {},
    bombardmentLosses: {},
  };

  const protectLand = input.ensureCapture && phase === 'land';

  // Pre-battle AA fire: one average shot per attacking aircraft. Victims
  // are dead before the battle starts and never fire.
  if (phase === 'land' && (input.defender.aaGun ?? 0) > 0) {
    const planes = (attacker.counts.fighter ?? 0) + (attacker.counts.bomber ?? 0);
    if (planes > 0) {
      applyExpectedHits(attacker, planes / 6, attackerOrder, catalog, result.aaLosses, {
        onlyAir: true,
      });
    }
  }

  // Pre-battle bombardment cover shots: instant kills against the fresh
  // defending force (weakest sacrifice-order units always fall first),
  // before anyone gets to fire.
  if (phase === 'land' && context.bombardmentSupport) {
    const bombardmentPool =
      ((input.attacker.battleship ?? 0) * 4 + (input.attacker.destroyer ?? 0) * 3) / 6;
    applyExpectedHits(defender, bombardmentPool, defenderOrder, catalog, result.bombardmentLosses, {});
  }

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (totalUnits(attacker) < ELIMINATION_EPSILON || totalUnits(defender) < ELIMINATION_EPSILON) {
      break;
    }

    const attackerLosses: UnitLossCounts = {};
    const defenderLosses: UnitLossCounts = {};
    const defenderHasDestroyer = (defender.counts.destroyer ?? 0) > PRESENCE_EPSILON;
    const attackerHasDestroyer = (attacker.counts.destroyer ?? 0) > PRESENCE_EPSILON;

    const attackerPools = firepower(attacker, 'attacker', catalog);

    // Submarine first strike: victims are removed before they can fire back.
    if (phase === 'naval' && !defenderHasDestroyer && attackerPools.sub > 0) {
      applyExpectedHits(defender, attackerPools.sub, defenderOrder, catalog, defenderLosses, {
        excludeAir: true,
      });
      attackerPools.sub = 0;
    }

    const defenderPools = firepower(defender, 'defender', catalog);

    if (phase === 'naval') {
      applyExpectedHits(defender, attackerPools.sub, defenderOrder, catalog, defenderLosses, {
        excludeAir: true,
      });
      applyExpectedHits(defender, attackerPools.air, defenderOrder, catalog, defenderLosses, {
        excludeSub: !attackerHasDestroyer,
      });
      applyExpectedHits(defender, attackerPools.other, defenderOrder, catalog, defenderLosses, {});

      applyExpectedHits(attacker, defenderPools.sub, attackerOrder, catalog, attackerLosses, {
        excludeAir: true,
      });
      applyExpectedHits(attacker, defenderPools.air, attackerOrder, catalog, attackerLosses, {
        excludeSub: !defenderHasDestroyer,
      });
      applyExpectedHits(attacker, defenderPools.other, attackerOrder, catalog, attackerLosses, {});
    } else {
      applyExpectedHits(
        defender,
        attackerPools.air + attackerPools.other,
        defenderOrder,
        catalog,
        defenderLosses,
        {},
      );
      applyExpectedHits(
        attacker,
        defenderPools.air + defenderPools.other,
        attackerOrder,
        catalog,
        attackerLosses,
        { protectLastLand: protectLand },
      );
    }

    // Standoff / stalled grind: nothing meaningful is changing anymore.
    if (sumCounts(attackerLosses) + sumCounts(defenderLosses) < STALL_EPSILON) break;

    result.rounds.push({ round, attacker: snapshot(attacker), defender: snapshot(defender) });
  }

  result.attackerSurvivors = snapshot(attacker);
  result.defenderSurvivors = snapshot(defender);
  return result;
}
