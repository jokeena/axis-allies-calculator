import { describe, expect, it } from 'vitest';
import { detectBattleContext } from './battleDetection';
import { emptyArmyComposition } from './unitCatalog';
import type { ArmyComposition } from './types';

function composition(overrides: Partial<ArmyComposition>): ArmyComposition {
  return { ...emptyArmyComposition(), ...overrides };
}

describe('detectBattleContext', () => {
  it('is a land battle when neither side has naval units', () => {
    const ctx = detectBattleContext(composition({ armor: 1 }), composition({ infantry: 1 }));
    expect(ctx).toEqual({ type: 'land', navalPhaseOccurs: false });
  });

  it('is amphibious when the attacker has both land and naval units', () => {
    const ctx = detectBattleContext(
      composition({ armor: 1, transport: 1 }),
      composition({ infantry: 1, destroyer: 1 }),
    );
    expect(ctx.type).toBe('amphibious');
    expect(ctx.navalPhaseOccurs).toBe(true); // defender has a navy to contest the zone
  });

  it('is amphibious with no naval phase when the defender has no navy to contest', () => {
    const ctx = detectBattleContext(composition({ armor: 1, transport: 1 }), composition({ infantry: 1 }));
    expect(ctx.type).toBe('amphibious');
    expect(ctx.navalPhaseOccurs).toBe(false);
  });

  it('treats a land invasion with a stray defender navy as a land battle, flagging the note', () => {
    const ctx = detectBattleContext(composition({ armor: 1 }), composition({ infantry: 1, destroyer: 1 }));
    expect(ctx.type).toBe('land');
    expect(ctx.navalPhaseOccurs).toBe(false);
    expect(ctx.strandedDefenderNavyNote).toBeTruthy();
  });

  it('is a naval battle when the attacker has no land units', () => {
    const ctx = detectBattleContext(composition({ destroyer: 1 }), composition({ submarine: 1 }));
    expect(ctx).toEqual({ type: 'naval', navalPhaseOccurs: true });
  });
});
