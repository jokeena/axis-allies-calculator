import { describe, expect, it } from 'vitest';
import { resolveAAFire, resolveBombardment } from './specialPhases';
import { createScriptedRng } from './testUtils';
import { UNIT_CATALOG } from './unitCatalog';
import type { UnitInstance } from './types';

function unit(type: UnitInstance['type'], side: UnitInstance['side']): UnitInstance {
  return { id: Math.random(), type, side, domain: UNIT_CATALOG[type].domain, hitsTaken: 0 };
}

describe('resolveAAFire', () => {
  it('does nothing if the defender has no AA gun', () => {
    const fighter = unit('fighter', 'attacker');
    const infantry = unit('infantry', 'defender');
    const rng = createScriptedRng([]); // no rolls should be consumed at all
    const result = resolveAAFire([fighter], [infantry], 'militaristic', UNIT_CATALOG, rng);
    expect(result.attackerDestroyed).toEqual([]);
  });

  it('does nothing if the attacker has no aircraft', () => {
    const infantry = unit('infantry', 'attacker');
    const aaGun = unit('aaGun', 'defender');
    const rng = createScriptedRng([]);
    const result = resolveAAFire([infantry], [aaGun], 'militaristic', UNIT_CATALOG, rng);
    expect(result.attackerDestroyed).toEqual([]);
  });

  it('fires one die per attacking aircraft, killing on a roll of 1, with no return fire', () => {
    const fighter = unit('fighter', 'attacker');
    const bomber = unit('bomber', 'attacker');
    const aaGun = unit('aaGun', 'defender');
    const rng = createScriptedRng([1, 5]); // fighter shot down, bomber survives
    const result = resolveAAFire([fighter, bomber], [aaGun], 'militaristic', UNIT_CATALOG, rng);
    expect(result.attackerDestroyed).toHaveLength(1);
  });
});

describe('resolveBombardment', () => {
  it('kills its casualties instantly — they are dead before the battle starts', () => {
    const battleship = unit('battleship', 'attacker'); // bombard <=4
    const infantry = unit('infantry', 'defender');
    const rng = createScriptedRng([4]); // battleship bombardment hits
    const result = resolveBombardment([battleship], [infantry], 'militaristic', UNIT_CATALOG, rng);
    expect(result.defenderDestroyed).toEqual([infantry]);
    expect(infantry.hitsTaken).toBe(1); // dead immediately, no chance to fight
  });

  it('produces no casualties if no bombardment-capable ship is present or none hit', () => {
    const carrier = unit('carrier', 'attacker'); // no bombard capability
    const infantry = unit('infantry', 'defender');
    const rng = createScriptedRng([]); // carrier can't bombard, so nothing should roll
    const result = resolveBombardment([carrier], [infantry], 'militaristic', UNIT_CATALOG, rng);
    expect(result.defenderDestroyed).toEqual([]);
  });
});
