import { applyHits, selectForDelayedCasualty } from './casualtyPriority';
import type { PriorityMode, UnitDefinition, UnitInstance, UnitType } from './types';
import type { Rng } from './rng';

function isAlive(unit: UnitInstance, catalog: Record<UnitType, UnitDefinition>): boolean {
  return unit.hitsTaken < catalog[unit.type].hitsToDestroy;
}

export interface AAFireResult {
  attackerDestroyed: UnitInstance[];
}

/**
 * One-shot AA fire before land combat begins: one d6 per attacking aircraft,
 * a roll of 1 shoots it down immediately with no return fire. Which plane is
 * lost is the attacker's own choice, so it's resolved via the same
 * priority-mode ranking that governs all of that side's casualty choices.
 */
export function resolveAAFire(
  attackerUnits: UnitInstance[],
  defenderUnits: UnitInstance[],
  mode: PriorityMode,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng,
): AAFireResult {
  const hasAAGun = defenderUnits.some((u) => catalog[u.type].isAAGun && isAlive(u, catalog));
  const attackingAircraft = attackerUnits.filter(
    (u) => catalog[u.type].domain === 'air' && isAlive(u, catalog),
  );

  if (!hasAAGun || attackingAircraft.length === 0) {
    return { attackerDestroyed: [] };
  }

  let hits = 0;
  for (let i = 0; i < attackingAircraft.length; i++) {
    if (rng.rollDie() <= 1) hits++;
  }
  if (hits === 0) return { attackerDestroyed: [] };

  return { attackerDestroyed: applyHits(attackingAircraft, hits, catalog, mode) };
}

export interface BombardmentResult {
  /** Units selected as bombardment casualties — still alive, still fight in
   * round 1 of the land phase, but are guaranteed removal after that round
   * (unless round 1's own fire already destroys them first). */
  condemned: UnitInstance[];
}

/**
 * One-shot amphibious bombardment support: the attacker's surviving
 * battleships (<=4) and destroyers (<=3) each fire once before round 1 of
 * the land battle. Per the rulebook this is a normal casualty selection —
 * the chosen units still fight in round 1 before being removed — so this
 * only *selects* casualties without finalizing their removal; the caller
 * finishes the job after round 1 resolves.
 */
export function resolveBombardment(
  attackerNavalUnits: UnitInstance[],
  defenderLandForce: UnitInstance[],
  mode: PriorityMode,
  catalog: Record<UnitType, UnitDefinition>,
  rng: Rng,
): BombardmentResult {
  let hits = 0;
  for (const unit of attackerNavalUnits) {
    if (!isAlive(unit, catalog)) continue;
    const bombard = catalog[unit.type].bombard;
    if (!bombard) continue;
    if (rng.rollDie() <= bombard.maxRoll) hits++;
  }
  if (hits === 0) return { condemned: [] };

  return { condemned: selectForDelayedCasualty(defenderLandForce, hits, catalog, mode) };
}
