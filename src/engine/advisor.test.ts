import { describe, expect, it } from 'vitest';
import { advisorCandidates, runAdvisor } from './advisor';
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
    trialCount: 2000,
    ensureCapture: false,
  };
}

describe('advisorCandidates', () => {
  it('offers land units, planes, and cover-shot warships in a land battle', () => {
    const candidates = advisorCandidates(input({ infantry: 2 }, { infantry: 2 }));
    const attackerTypes = candidates.filter((c) => c.side === 'attacker').map((c) => c.type);
    expect(attackerTypes).toContain('battleship');
    expect(attackerTypes).toContain('destroyer');
    expect(attackerTypes).not.toContain('submarine');
    // Defender has no AA gun yet, so +1 AA gun is on the menu.
    expect(candidates.some((c) => c.side === 'defender' && c.type === 'aaGun')).toBe(true);
  });

  it('never offers a second AA gun', () => {
    const candidates = advisorCandidates(input({ infantry: 2 }, { infantry: 2, aaGun: 1 }));
    expect(candidates.some((c) => c.type === 'aaGun')).toBe(false);
  });

  it('offers ships and planes in a sea battle, but no defender bombers and no land troops', () => {
    const candidates = advisorCandidates(input({ destroyer: 1 }, { submarine: 1 }));
    expect(candidates.some((c) => c.type === 'infantry')).toBe(false);
    expect(candidates.some((c) => c.side === 'attacker' && c.type === 'bomber')).toBe(true);
    expect(candidates.some((c) => c.side === 'defender' && c.type === 'bomber')).toBe(false);
  });
});

describe('runAdvisor', () => {
  it('reports higher attacker win% for attacker reinforcements and lower for defender ones', () => {
    const battleInput = input({ infantry: 2 }, { infantry: 2 });
    const rows = runAdvisor(battleInput, UNIT_CATALOG);

    const attackerArmor = rows.find((r) => r.side === 'attacker' && r.type === 'armor');
    const defenderArmor = rows.find((r) => r.side === 'defender' && r.type === 'armor');
    expect(attackerArmor).toBeDefined();
    expect(defenderArmor).toBeDefined();
    // A 2v2 infantry fight is close; +1 armor should swing it decisively in
    // whichever direction it's added (wide margins to tolerate MC noise).
    expect(attackerArmor!.attackerWinPct).toBeGreaterThan(55);
    expect(defenderArmor!.attackerWinPct).toBeLessThan(45);
  });

  it('reports defenderWinPct on every row, for use as the defense-side metric', () => {
    const battleInput = input({ infantry: 2 }, { infantry: 2 });
    const rows = runAdvisor(battleInput, UNIT_CATALOG);

    const defenderArmor = rows.find((r) => r.side === 'defender' && r.type === 'armor');
    // +1 defending armor should swing the defender's own win% up decisively.
    expect(defenderArmor!.defenderWinPct).toBeGreaterThan(45);
  });
});
