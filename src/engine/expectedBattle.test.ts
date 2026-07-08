import { describe, expect, it } from 'vitest';
import { applyExpectedHits, makeForce, runExpectedBattle } from './expectedBattle';
import { emptyArmyComposition, UNIT_CATALOG } from './unitCatalog';
import type { ArmyComposition, BattleInput } from './types';

function composition(overrides: Partial<ArmyComposition>): ArmyComposition {
  return { ...emptyArmyComposition(), ...overrides };
}

function input(
  attacker: Partial<ArmyComposition>,
  defender: Partial<ArmyComposition>,
  ensureCapture = false,
): BattleInput {
  return {
    attacker: composition(attacker),
    defender: composition(defender),
    priorityMode: 'militaristic',
    trialCount: 1,
    ensureCapture,
  };
}

describe('runExpectedBattle — deterministic attrition in sacrifice order', () => {
  it('drains the weakest unit type fully before touching stronger ones', () => {
    // Defender deals 4 × 2/6 = 1.3333 expected hits in round 1. Militaristic
    // sacrifices attacking infantry (attack 1) before armor (attack 3), so
    // ALL of that damage lands on infantry: 2 → 0.6667, armor untouched.
    // Attacker deals 2 × 1/6 + 2 × 3/6 = 1.3333 to the defender's infantry.
    const result = runExpectedBattle(input({ infantry: 2, armor: 2 }, { infantry: 4 }), UNIT_CATALOG);

    const round1 = result.rounds[0];
    expect(round1.round).toBe(1);
    expect(round1.attacker.infantry).toBeCloseTo(2 - 4 / 3, 4);
    expect(round1.attacker.armor).toBeCloseTo(2, 4);
    expect(round1.defender.infantry).toBeCloseTo(4 - 4 / 3, 4);
  });

  it('a decisive attacker ends with weak types spent and strong types intact', () => {
    // Attacker heavily outguns the defender; infantry should be the only
    // attacker type that took damage, and the defender should be wiped out.
    const result = runExpectedBattle(
      input({ infantry: 6, armor: 3, fighter: 3 }, { infantry: 3 }),
      UNIT_CATALOG,
    );

    expect(result.defenderSurvivors.infantry ?? 0).toBeLessThan(0.05);
    expect(result.attackerSurvivors.armor).toBeCloseTo(3, 4);
    expect(result.attackerSurvivors.fighter).toBeCloseTo(3, 4);
    expect(result.attackerSurvivors.infantry).toBeLessThan(6);
  });

  it('AA fire takes an expected 1/6 per plane before round 1, cheapest-context planes first', () => {
    // 6 planes → exactly 1 expected AA kill. Militaristic attacker ranks
    // fighter (attack 3) below bomber (attack 4), so the fighter dies.
    const result = runExpectedBattle(
      input({ fighter: 3, bomber: 3, armor: 1 }, { infantry: 1, aaGun: 1 }),
      UNIT_CATALOG,
    );

    expect(result.aaLosses.fighter).toBeCloseTo(1, 4);
    expect(result.aaLosses.bomber ?? 0).toBe(0);
    // Pre-battle strikes are not combat rounds — rounds start at 1.
    expect(result.rounds[0].round).toBe(1);
  });

  it('bombardment cover shots kill instantly before the battle, weakest first', () => {
    // Battleship cover shot = 4/6 expected hits, applied to the fresh
    // defender BEFORE anyone fires — so the defender fights round 1 with
    // only 2 - 4/6 infantry, and those victims never shoot back.
    const result = runExpectedBattle(
      input({ infantry: 1, battleship: 1 }, { infantry: 2 }),
      UNIT_CATALOG,
    );

    expect(result.bombardmentLosses.infantry).toBeCloseTo(4 / 6, 4);
    const round1 = result.rounds[0];
    expect(round1.round).toBe(1);
    expect(round1.defender.infantry).toBeCloseTo(2 - 4 / 6 - 1 / 6, 4);
    // Defender round-1 output comes from the post-bombardment force.
    expect(round1.attacker.infantry).toBeCloseTo(1 - ((2 - 4 / 6) * 2) / 6, 4);
    // Ships never appear in the land force itself.
    expect(result.attackerStart.battleship).toBeUndefined();
  });

  it('ensure capture reserves the last land unit — aircraft absorb the damage instead', () => {
    // Defender deals exactly 6 × 2/6 = 2 hits. Without protection those
    // would kill the lone infantry first; with Ensure Capture the two
    // fighters die and the infantry survives round 1 untouched.
    const result = runExpectedBattle(
      input({ infantry: 1, fighter: 2 }, { infantry: 6 }, true),
      UNIT_CATALOG,
    );

    const round1 = result.rounds[0];
    expect(round1.attacker.fighter).toBeCloseTo(0, 4);
    expect(round1.attacker.infantry).toBeCloseTo(1, 4);
  });

  it('a fighter-vs-submarine standoff produces no rounds and full survivors', () => {
    const result = runExpectedBattle(input({ fighter: 1 }, { submarine: 1 }), UNIT_CATALOG);

    expect(result.phase).toBe('naval');
    expect(result.rounds).toHaveLength(0);
    expect(result.attackerSurvivors.fighter).toBeCloseTo(1, 4);
    expect(result.defenderSurvivors.submarine).toBeCloseTo(1, 4);
  });
});

describe('applyExpectedHits — reserve option (preserved transports)', () => {
  it('protects the reserved amount until every other eligible type is drained', () => {
    const force = makeForce({ transport: 2, destroyer: 1 }, ['sea'], UNIT_CATALOG);
    const kills = {};
    // 1.5 hits: the 1 free transport (2 - 1 reserved) fully absorbs 1 hit,
    // the remaining 0.5 spills onto the destroyer — the reserved transport
    // is untouched.
    applyExpectedHits(force, 1.5, ['transport', 'destroyer'], UNIT_CATALOG, kills, {
      reserve: { type: 'transport', amount: 1 },
    });
    expect(force.counts.transport).toBeCloseTo(1, 4);
    expect(force.counts.destroyer).toBeCloseTo(0.5, 4);
  });

  it('spills into the reserved amount once everything else is exhausted', () => {
    const force = makeForce({ transport: 2, destroyer: 1 }, ['sea'], UNIT_CATALOG);
    const kills = {};
    // 3 hits: 1 free transport + 1 destroyer = 2 hits consumed first, the
    // last hit finally reaches the reserved transport.
    applyExpectedHits(force, 3, ['transport', 'destroyer'], UNIT_CATALOG, kills, {
      reserve: { type: 'transport', amount: 1 },
    });
    expect(force.counts.transport).toBeCloseTo(0, 4);
    expect(force.counts.destroyer).toBeCloseTo(0, 4);
  });
});
