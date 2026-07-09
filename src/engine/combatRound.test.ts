import { describe, expect, it } from 'vitest';
import { resolveRound } from './combatRound';
import { createScriptedRng } from './testUtils';
import { UNIT_CATALOG } from './unitCatalog';
import type { UnitInstance } from './types';

function unit(type: UnitInstance['type'], side: UnitInstance['side']): UnitInstance {
  return { id: Math.random(), type, side, domain: UNIT_CATALOG[type].domain, hitsTaken: 0 };
}

describe('resolveRound — submarine first strike', () => {
  it('fires before the main exchange, with no return fire, when the defender has no destroyer', () => {
    const sub = unit('submarine', 'attacker');
    const transport = unit('transport', 'defender');

    // Exactly one roll expected: the sub's first-strike attack. Since the
    // transport dies to first strike, it must NOT get a chance to fire back,
    // and the sub (already fired) must NOT roll again in the main exchange —
    // a scripted RNG of length 1 that isn't exhausted proves both.
    const rng = createScriptedRng([1]); // <=2, first-strike hit
    const result = resolveRound([sub], [transport], 'naval', 'militaristic', UNIT_CATALOG, rng);

    expect(result.defenderDestroyed).toEqual([transport]);
    expect(result.attackerDestroyed).toEqual([]);
  });

  it('is negated when the defender has an alive destroyer — the sub fights in the main exchange instead', () => {
    const sub = unit('submarine', 'attacker');
    const destroyer = unit('destroyer', 'defender');
    const transport = unit('transport', 'defender');

    // No first-strike roll consumed; main exchange order: sub attack,
    // destroyer defense, transport defense.
    const rng = createScriptedRng([2, 6, 6]); // sub hits (<=2), both defenders miss
    const result = resolveRound(
      [sub],
      [destroyer, transport],
      'naval',
      'militaristic',
      UNIT_CATALOG,
      rng,
    );

    // Militaristic: sacrifice lowest defense value first — transport (1)
    // before destroyer (3).
    expect(result.defenderDestroyed).toEqual([transport]);
    expect(result.attackerDestroyed).toEqual([]);
  });
});

describe('resolveRound — air vs. submarine restriction', () => {
  it("a fighter's hits cannot land on a submarine when the attacker has no destroyer", () => {
    const fighter = unit('fighter', 'attacker');
    const submarine = unit('submarine', 'defender');
    const transport = unit('transport', 'defender');

    const rng = createScriptedRng([1, 6, 6]); // fighter hits, sub & transport both miss on defense
    const result = resolveRound(
      [fighter],
      [submarine, transport],
      'naval',
      'militaristic',
      UNIT_CATALOG,
      rng,
    );

    expect(result.defenderDestroyed).toEqual([transport]);
  });

  it("a fighter's hits CAN land on a submarine when the attacker has a destroyer present", () => {
    const fighter = unit('fighter', 'attacker');
    const destroyer = unit('destroyer', 'attacker');
    const submarine = unit('submarine', 'defender');

    // fighter attack, destroyer attack, then submarine defense.
    const rng = createScriptedRng([1, 6, 6]); // fighter hits, destroyer misses, sub defense misses
    const result = resolveRound(
      [fighter, destroyer],
      [submarine],
      'naval',
      'militaristic',
      UNIT_CATALOG,
      rng,
    );

    expect(result.defenderDestroyed).toEqual([submarine]);
  });
});

describe('resolveRound — infantry/artillery pairing', () => {
  it('boosts exactly min(infantry, artillery) attacking infantry to attack value 2', () => {
    const infantry1 = unit('infantry', 'attacker');
    const infantry2 = unit('infantry', 'attacker');
    const artillery = unit('artillery', 'attacker');
    const defInfantry1 = unit('infantry', 'defender');
    const defInfantry2 = unit('infantry', 'defender');
    const defInfantry3 = unit('infantry', 'defender');

    // infantry1 rolls 2 -> hit only because it's boosted (unboosted attack is 1).
    // infantry2 rolls 2 -> miss, since only 1 of the 2 infantry gets boosted.
    // artillery rolls 2 -> always hits at its normal attack value of 2.
    // Then three defending infantry all roll a miss (6 > defense 2).
    const rng = createScriptedRng([2, 2, 2, 6, 6, 6]);
    const result = resolveRound(
      [infantry1, infantry2, artillery],
      [defInfantry1, defInfantry2, defInfantry3],
      'land',
      'militaristic',
      UNIT_CATALOG,
      rng,
    );

    expect(result.defenderDestroyed).toHaveLength(2);
    expect(result.attackerDestroyed).toEqual([]);
  });
});

describe('resolveRound — AA guns never participate in the ongoing round', () => {
  it('does not roll a defense die for an AA gun in the main exchange', () => {
    const infantry = unit('infantry', 'attacker');
    const aaGun = unit('aaGun', 'defender');

    // Only one roll scripted (the attacker's infantry). If the AA gun
    // incorrectly rolled too, the scripted RNG would throw from being
    // over-consumed.
    const rng = createScriptedRng([6]); // infantry attack misses (6 > 1)
    const result = resolveRound([infantry], [aaGun], 'land', 'militaristic', UNIT_CATALOG, rng);

    expect(result.attackerDestroyed).toEqual([]);
    expect(result.defenderDestroyed).toEqual([]);
  });
});
