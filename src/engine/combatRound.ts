import { applyHits } from './casualtyPriority';
import type { Phase, PriorityMode, UnitDefinition, UnitInstance, UnitType } from './types';
import type { Rng } from './rng';

export interface RoundResult {
  attackerDestroyed: UnitInstance[];
  defenderDestroyed: UnitInstance[];
}

function isAlive(unit: UnitInstance, catalog: Record<UnitType, UnitDefinition>): boolean {
  return unit.hitsTaken < catalog[unit.type].hitsToDestroy;
}

/**
 * Resolves one simultaneous combat round shared by both the naval and land
 * phases. Both sides roll against the pre-round-start roster (so a unit
 * that's hit this round still gets to fire back once, per the rulebook's
 * "combat is simultaneous" framing) before any casualties are removed.
 *
 * Naval-only mechanics (submarine first strike, air/submarine mutual
 * restrictions) are gated on `phase === 'naval'` and have no effect during
 * the land phase, since submarines never appear there.
 */
export function resolveRound(
  attackerUnits: UnitInstance[],
  defenderUnits: UnitInstance[],
  phase: Phase,
  mode: PriorityMode,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng,
  protectAttackerLand = false,
): RoundResult {
  const attackerDestroyed: UnitInstance[] = [];
  const defenderDestroyed: UnitInstance[] = [];

  // Snapshot destroyer presence at round start — every exclusion rule below
  // uses this snapshot, not a mid-round recheck, consistent with the
  // simultaneous-round model (everyone acts on start-of-round state).
  const attackerHasDestroyer = attackerUnits.some(
    (u) => u.type === 'destroyer' && isAlive(u, catalog),
  );
  const defenderHasDestroyer = defenderUnits.some(
    (u) => u.type === 'destroyer' && isAlive(u, catalog),
  );

  let attackerFirers = attackerUnits.filter((u) => isAlive(u, catalog));

  // --- Submarine first strike (naval phase only) ---
  // Attacking submarines fire before the main exchange, every round, unless
  // the defender has a destroyer present. Hits are immediate removals with
  // no return fire. Submarines can never target air units (no exception,
  // even with a destroyer present — that exception only runs the other way,
  // see the air-vs-sub rule in the main exchange below).
  if (phase === 'naval' && !defenderHasDestroyer) {
    const firstStrikeSubs = attackerFirers.filter((u) => u.type === 'submarine');
    if (firstStrikeSubs.length > 0) {
      let hits = 0;
      for (let i = 0; i < firstStrikeSubs.length; i++) {
        if (rng.rollDie() <= catalog.submarine.attack) hits++;
      }
      if (hits > 0) {
        const candidates = defenderUnits.filter(
          (u) => catalog[u.type].domain !== 'air' && isAlive(u, catalog),
        );
        defenderDestroyed.push(...applyHits(candidates, hits, catalog, mode));
      }
      // These subs already fired this round — they sit out the main exchange.
      attackerFirers = attackerFirers.filter((u) => u.type !== 'submarine');
    }
  }

  // Recomputed fresh (not a pre-first-strike snapshot) so that any defender
  // unit first-strike just killed correctly sits out the main exchange too —
  // first-strike casualties get no return fire at all, per the rulebook.
  const defenderFirers = defenderUnits.filter((u) => isAlive(u, catalog));

  // --- Main simultaneous exchange ---
  // Infantry/artillery pairing only ever matters for the attacker (defending
  // infantry+artillery get no bonus per the rulebook), and only in the land
  // phase since both are land-domain units.
  const attackerInfantry = attackerFirers.filter((u) => u.type === 'infantry');
  const attackerArtillery = attackerFirers.filter((u) => u.type === 'artillery');
  const boostedPairCount = Math.min(attackerInfantry.length, attackerArtillery.length);

  let attackerSubHits = 0;
  let attackerAirHits = 0;
  let attackerOtherHits = 0;
  let boostedUsed = 0;
  for (const unit of attackerFirers) {
    if (catalog[unit.type].isAAGun) continue; // AA guns only fire in the special pre-round AA event
    const def = catalog[unit.type];
    let attackValue = def.attack;
    if (unit.type === 'infantry' && boostedUsed < boostedPairCount) {
      attackValue = 2;
      boostedUsed++;
    }
    if (attackValue <= 0) continue;
    if (rng.rollDie() <= attackValue) {
      if (unit.type === 'submarine') attackerSubHits++;
      else if (def.domain === 'air') attackerAirHits++;
      else attackerOtherHits++;
    }
  }

  let defenderSubHits = 0;
  let defenderAirHits = 0;
  let defenderOtherHits = 0;
  for (const unit of defenderFirers) {
    if (catalog[unit.type].isAAGun) continue; // AA guns only fire in the special pre-round AA event
    const def = catalog[unit.type];
    const defenseValue = def.defense;
    if (defenseValue <= 0) continue;
    if (rng.rollDie() <= defenseValue) {
      if (unit.type === 'submarine') defenderSubHits++;
      else if (def.domain === 'air') defenderAirHits++;
      else defenderOtherHits++;
    }
  }

  // Apply attacker-caused hits against the defender's roster.
  const applyAttackerBatch = (count: number, excludeAir: boolean, excludeSub: boolean): void => {
    if (count <= 0) return;
    const candidates = defenderUnits.filter((u) => {
      if (!isAlive(u, catalog)) return false;
      if (excludeAir && catalog[u.type].domain === 'air') return false;
      if (excludeSub && u.type === 'submarine') return false;
      return true;
    });
    defenderDestroyed.push(...applyHits(candidates, count, catalog, mode));
  };
  // Sub-caused hits can never land on air units (rule holds regardless of destroyers).
  applyAttackerBatch(attackerSubHits, true, false);
  // Air-caused hits can only land on subs if the attacker has a destroyer.
  applyAttackerBatch(attackerAirHits, false, !attackerHasDestroyer);
  // Everything else (land/surface-ship attackers) has no domain restriction.
  applyAttackerBatch(attackerOtherHits, false, false);

  // Apply defender-caused hits against the attacker's roster (mirror image).
  const applyDefenderBatch = (count: number, excludeAir: boolean, excludeSub: boolean): void => {
    if (count <= 0) return;
    const candidates = attackerUnits.filter((u) => {
      if (!isAlive(u, catalog)) return false;
      if (excludeAir && catalog[u.type].domain === 'air') return false;
      if (excludeSub && u.type === 'submarine') return false;
      return true;
    });
    attackerDestroyed.push(...applyHits(candidates, count, catalog, mode, protectAttackerLand));
  };
  applyDefenderBatch(defenderSubHits, true, false);
  applyDefenderBatch(defenderAirHits, false, !defenderHasDestroyer);
  applyDefenderBatch(defenderOtherHits, false, false);

  return { attackerDestroyed, defenderDestroyed };
}
