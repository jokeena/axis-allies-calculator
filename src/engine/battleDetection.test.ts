import { describe, expect, it } from 'vitest';
import { detectBattleContext } from './battleDetection';
import { emptyArmyComposition } from './unitCatalog';
import type { ArmyComposition } from './types';

function composition(overrides: Partial<ArmyComposition>): ArmyComposition {
  return { ...emptyArmyComposition(), ...overrides };
}

describe('detectBattleContext', () => {
  it('land troops on either side make it a land battle', () => {
    expect(detectBattleContext(composition({ armor: 1 }), composition({ infantry: 1 })).type).toBe('land');
    // Defender-only land troops still force a land battle (air raid on a garrison).
    expect(detectBattleContext(composition({ fighter: 1 }), composition({ infantry: 1 })).type).toBe('land');
  });

  it('a land battle with attacker warships enables bombardment support and notes that ships sit out', () => {
    const ctx = detectBattleContext(
      composition({ armor: 1, transport: 1, battleship: 1 }),
      composition({ infantry: 1, destroyer: 1 }),
    );
    expect(ctx.type).toBe('land');
    expect(ctx.bombardmentSupport).toBe(true);
    expect(ctx.note).toBeTruthy();
  });

  it('a land battle with only non-bombarding ships still notes them but grants no support', () => {
    const ctx = detectBattleContext(composition({ armor: 1, transport: 1 }), composition({ infantry: 1 }));
    expect(ctx.type).toBe('land');
    expect(ctx.bombardmentSupport).toBe(false);
    expect(ctx.note).toBeTruthy();
  });

  it('a pure land battle carries no note', () => {
    const ctx = detectBattleContext(composition({ armor: 1 }), composition({ infantry: 1 }));
    expect(ctx.bombardmentSupport).toBe(false);
    expect(ctx.note).toBeUndefined();
  });

  it('no land troops anywhere means a sea battle', () => {
    expect(detectBattleContext(composition({ destroyer: 1 }), composition({ submarine: 1 })).type).toBe('naval');
    expect(detectBattleContext(composition({ fighter: 1 }), composition({ submarine: 1 })).type).toBe('naval');
  });

  it('planes-only fights fall back to land-battle mechanics', () => {
    const ctx = detectBattleContext(composition({ fighter: 1 }), composition({ fighter: 1 }));
    expect(ctx.type).toBe('land');
    expect(ctx.note).toBeUndefined();
  });
});
