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

describe('runTrial — land battles with ships present', () => {
  it('bombardment cover shots kill instantly, before the battle begins', () => {
    const battleInput = input({ armor: 1, battleship: 1 }, { infantry: 1 });
    // A single roll: the battleship's cover shot hits and kills the only
    // defender outright — the battle is over before round 1, and the victim
    // never fires. Scripted length 1 proves no combat dice were rolled.
    const rng = createScriptedRng([4]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0]).toEqual({
      phase: 'land',
      round: 0,
      attackerLosses: {},
      defenderLosses: { infantry: 1 },
    });
    expect(result.bombardmentLosses.infantry).toBe(1);
  });

  it("the defender's ships sit out of a land battle entirely and cannot die", () => {
    // With land troops involved this is a land battle — the defending
    // destroyer never fights, never rolls, and never appears in losses.
    const battleInput = input({ armor: 1 }, { infantry: 1, destroyer: 1 });
    // Exactly two rolls: armor attack (hit) and infantry defense (miss). A
    // scripted RNG of length 2 proves the destroyer never rolled.
    const rng = createScriptedRng([1, 6]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
    expect(result.rounds.every((r) => r.phase === 'land')).toBe(true);
    for (const round of result.rounds) {
      expect(round.defenderLosses.destroyer).toBeUndefined();
    }
  });

  it('only bombardment-capable attacker ships fire cover shots; the rest sit out', () => {
    // Battleship bombards; the transport has no cover-shot ability and no
    // land-battle role at all. Script length 1 proves exactly one
    // bombardment die was rolled and nothing else fired.
    const battleInput = input({ infantry: 1, battleship: 1, transport: 1 }, { infantry: 1 });
    const rng = createScriptedRng([4]); // battleship cover shot kills the defender instantly
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
    expect(result.bombardmentLosses.infantry).toBe(1);
    // No attacker ship can be lost in a land battle.
    for (const round of result.rounds) {
      expect(round.attackerLosses.battleship).toBeUndefined();
      expect(round.attackerLosses.transport).toBeUndefined();
    }
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

describe('runTrial — standoff when neither side can ever hit the other', () => {
  it('fighter vs. submarine (no destroyer) ends immediately as a standoff, both alive', () => {
    const battleInput = input({ fighter: 1 }, { submarine: 1 });
    const rng = createScriptedRng([]); // no dice at all — the battle never starts
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('standoff');
    expect(result.rounds).toHaveLength(0);
  });

  it('is not a standoff once a destroyer joins the fighters', () => {
    const battleInput = input({ fighter: 1, destroyer: 1 }, { submarine: 1 });
    // destroyer attack hits (<=3); fighter also fires; sub defense misses.
    const rng = createScriptedRng([6, 3, 6]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
  });
});

describe('runTrial — Ensure Capture mode', () => {
  it('sacrifices aircraft before the last land unit', () => {
    // Militaristic mode would normally sacrifice the infantry (attack 1)
    // before the fighter (attack 3) — Ensure Capture overrides that for the
    // final land unit.
    const battleInput = input({ infantry: 1, fighter: 1 }, { artillery: 1 }, true);
    const rng = createScriptedRng([
      6, 6, 1, // round 1: infantry misses, fighter misses, artillery hits
      1, 6, //    round 2: infantry hits, artillery misses back
    ]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.rounds[0].attackerLosses.fighter).toBe(1); // fighter died, not infantry
    expect(result.rounds[0].attackerLosses.infantry).toBeUndefined();
    expect(result.outcome).toBe('attackerWins');
  });

  it('scores clearing the defender with only aircraft as clearedNotCaptured', () => {
    const battleInput = input({ fighter: 1 }, { infantry: 1 }, true);
    const rng = createScriptedRng([1, 6]); // fighter hits, infantry misses
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('clearedNotCaptured');
  });

  it('the same air-only sweep counts as a normal win when Ensure Capture is off', () => {
    const battleInput = input({ fighter: 1 }, { infantry: 1 }, false);
    const rng = createScriptedRng([1, 6]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.outcome).toBe('attackerWins');
  });
});

describe('runTrial — special-loss attribution', () => {
  it('attributes AA-fire kills to aaLosses', () => {
    const battleInput = input({ fighter: 2, armor: 1 }, { infantry: 1, aaGun: 1 });
    const rng = createScriptedRng([
      1, 5, // AA fire: first fighter shot down, second survives
      1, 6, 6, // round 1: armor hits, surviving fighter misses, infantry misses
    ]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.aaLosses.fighter).toBe(1);
    expect(result.rounds[0]).toEqual({
      phase: 'land',
      round: 0,
      attackerLosses: { fighter: 1 },
      defenderLosses: {},
    });
    expect(result.outcome).toBe('attackerWins');
  });

  it('records a combined pre-battle row when both AA fire and bombardment hit', () => {
    const battleInput = input(
      { infantry: 1, fighter: 1, battleship: 1 },
      { infantry: 2, aaGun: 1 },
    );
    const rng = createScriptedRng([
      1, // AA fire downs the fighter
      4, // bombardment kills one defending infantry
      6, // round 1: attacker infantry misses
      6, // round 1: remaining defender infantry misses
      1, // round 2: attacker infantry hits
      6, // round 2: defender infantry misses
    ]);
    const result = runTrial(battleInput, UNIT_CATALOG, rng);

    expect(result.rounds[0]).toEqual({
      phase: 'land',
      round: 0,
      attackerLosses: { fighter: 1 },
      defenderLosses: { infantry: 1 },
    });
    expect(result.aaLosses.fighter).toBe(1);
    expect(result.bombardmentLosses.infantry).toBe(1);
    expect(result.outcome).toBe('attackerWins');
  });
});
