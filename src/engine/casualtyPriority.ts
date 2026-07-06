import type { PriorityMode, UnitDefinition, UnitInstance, UnitType } from './types';

function contextValue(unit: UnitInstance, catalog: Record<UnitType, UnitDefinition>): number {
  const def = catalog[unit.type];
  return unit.side === 'attacker' ? def.attack : def.defense;
}

function compareForSacrifice(
  a: UnitInstance,
  b: UnitInstance,
  mode: PriorityMode,
  catalog: Record<UnitType, UnitDefinition>,
): number {
  const defA = catalog[a.type];
  const defB = catalog[b.type];
  const valueA = contextValue(a, catalog);
  const valueB = contextValue(b, catalog);

  if (mode === 'militaristic') {
    // Sacrifice the lowest-hitting units first; ties broken toward keeping
    // the pricier unit alive (sacrifice the cheaper one on a tie).
    if (valueA !== valueB) return valueA - valueB;
    return defA.cost - defB.cost;
  }

  // Economical: sacrifice the cheapest units first; ties broken toward
  // keeping the highest-hitting unit alive (sacrifice the lower-value one).
  if (defA.cost !== defB.cost) return defA.cost - defB.cost;
  return valueA - valueB;
}

/**
 * Applies `hitCount` hits to `candidates` (units belonging to the side that
 * was hit), mutating their `hitsTaken` in place. Returns the units fully
 * destroyed by this call (for loss counting) — a damaged-but-surviving
 * battleship is not a loss.
 *
 * Undamaged battleships soak the first hits "for free" (damaged, not
 * destroyed) ahead of everything else: this costs nothing this round (a
 * damaged battleship fights at full strength) and is never a worse choice
 * than sacrificing a different unit outright, under either priority mode.
 * After that, remaining hits are applied in priority-mode order. AA guns are
 * never eligible casualties and are filtered out regardless of what the
 * caller passes in.
 */
export function applyHits(
  candidates: UnitInstance[],
  hitCount: number,
  catalog: Record<UnitType, UnitDefinition>,
  mode: PriorityMode,
): UnitInstance[] {
  const eligible = candidates.filter((u) => !catalog[u.type].isAAGun);
  let remaining = hitCount;
  const destroyed: UnitInstance[] = [];

  const undamagedBattleships = eligible.filter(
    (u) => u.type === 'battleship' && u.hitsTaken === 0,
  );
  for (const battleship of undamagedBattleships) {
    if (remaining <= 0) break;
    battleship.hitsTaken += 1;
    remaining -= 1;
  }

  if (remaining <= 0) return destroyed;

  const pool = eligible
    .filter((u) => u.hitsTaken < catalog[u.type].hitsToDestroy)
    .sort((a, b) => compareForSacrifice(a, b, mode, catalog));

  for (const unit of pool) {
    if (remaining <= 0) break;
    unit.hitsTaken += 1;
    remaining -= 1;
    if (unit.hitsTaken >= catalog[unit.type].hitsToDestroy) {
      destroyed.push(unit);
    }
  }

  return destroyed;
}

/**
 * Selects which units would be sacrificed from `hitCount` hits using the
 * same priority-mode ranking as applyHits, but does NOT mutate anything.
 * Used for mechanics where a hit unit still gets to fight one more round
 * before actually being removed (amphibious bombardment support) — the
 * caller is responsible for finalizing the removal after that round.
 */
export function selectForDelayedCasualty(
  candidates: UnitInstance[],
  hitCount: number,
  catalog: Record<UnitType, UnitDefinition>,
  mode: PriorityMode,
): UnitInstance[] {
  const eligible = candidates.filter(
    (u) => !catalog[u.type].isAAGun && u.hitsTaken < catalog[u.type].hitsToDestroy,
  );
  const sorted = eligible.sort((a, b) => compareForSacrifice(a, b, mode, catalog));
  return sorted.slice(0, hitCount);
}
