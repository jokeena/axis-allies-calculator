import { describe, expect, it } from 'vitest';
import { runTrial } from './battleSequencer';
import { createScriptedRng } from './testUtils';
import { emptyArmyComposition, UNIT_CATALOG } from './unitCatalog';
import type { ArmyComposition, BattleInput } from './types';

function composition(overrides: Partial<ArmyComposition>): ArmyComposition {
  return { ...emptyArmyComposition(), ...overrides };
}

function input(
  attacker: Partial<ArmyComposition>,
  defender: Partial<ArmyComposition>,
): BattleInput {
  return {
    attacker: composition(attacker),
    defender: composition(defender),
    priorityMode: 'militaristic',
    trialCount: 1,
  };
}

describe('runTrial — battleship takes two hits to sink', () => {
  it('survives a first hit (damaged) and is destroyed by a second hit in a later round', () => {
    const battleInput = input({ destroyer: 1 }, { battleship: 1 });
    // Round 1: destroyer attack (<=3) hits, battleship defense (>4) misses.
    // Round 2: same again — the second hit sinks the already-damaged battleship.
    const rng = createScriptedRng([3, 6, 3, 6]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0].defenderLosses.battleship ?? 0).toBe(0); // damaged, not lost
    expect(result.rounds[1].defenderLosses.battleship).toBe(1); // sunk on the second hit
  });
});

describe('runTrial — amphibious assault sea-zone-clear rule', () => {
  it('fails the invasion (defenderWins, no land phase) if the defender still holds the sea zone', () => {
    // Attacker: an armor unit escorted by a transport (attack 0 — can never
    // hurt the defending destroyer). Defender: a destroyer that will sink
    // the transport outright, leaving the sea zone contested.
    const battleInput = input({ armor: 1, transport: 1 }, { destroyer: 1, infantry: 1 });
    const rng = createScriptedRng([3]); // defender destroyer's defense roll, <=3, hits the transport
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('defenderWins');
    expect(result.rounds.every((r) => r.phase === 'naval')).toBe(true);
    expect(result.rounds).toHaveLength(1);
  });

  it('proceeds straight to the land phase (with bombardment) when the defender has no navy', () => {
    // Attacker: armor + a bombarding battleship. Defender: infantry only,
    // no navy — so the naval phase never runs at all.
    const battleInput = input({ armor: 1, battleship: 1 }, { infantry: 1 });
    const rng = createScriptedRng([
      4, // bombardment: battleship rolls <=4, condemns the infantry
      6, // land round 1: armor attack misses naturally
      6, // land round 1: infantry defense misses naturally
    ]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.rounds.every((r) => r.phase === 'land')).toBe(true);
    expect(result.outcome).toBe('attackerWins');
    // The infantry loss is attributed to round 1 even though neither side's
    // own dice hit anything that round — it was already condemned by the
    // bombardment support shot before round 1 began.
    expect(result.rounds[0].defenderLosses.infantry).toBe(1);
  });
});

describe('runTrial — a lone surviving AA gun cannot hold off the attacker', () => {
  it('resolves as an attacker win instead of stalling once the defender has only an AA gun left', () => {
    // AA guns can never be selected as a casualty, so once every other
    // defending unit is dead, the battle must still end — an AA gun alone
    // can't contest the territory.
    const battleInput = input({ armor: 1 }, { infantry: 1, aaGun: 1 });
    const rng = createScriptedRng([1, 6]); // armor attack hits (<=3), infantry defense misses
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
    expect(result.rounds).toHaveLength(1);
  });
});
