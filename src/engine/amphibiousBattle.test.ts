import { describe, expect, it } from 'vitest';
import {
  amphibiousValidationErrors,
  buildBoatManifest,
  runAmphibiousCalculation,
  runExpectedAmphibious,
  transportsNeeded,
} from './amphibiousBattle';
import { createScriptedRng } from './testUtils';
import { UNIT_CATALOG } from './unitCatalog';
import type { AmphibiousInput } from './amphibiousBattle';

function makeInput(overrides: {
  attacker?: Partial<AmphibiousInput['attacker']>;
  defender?: Partial<AmphibiousInput['defender']>;
  ensureCapture?: boolean;
  trialCount?: number;
}): AmphibiousInput {
  return {
    attacker: {
      seaFleet: {},
      seaPlanes: {},
      seaTransports: 0,
      seaCargo: {},
      preserveTransports: 0,
      heldBackTransports: 0,
      heldBackCargo: {},
      coverShips: {},
      landTroops: {},
      landPlanes: {},
      ...overrides.attacker,
    },
    defender: {
      seaFleet: {},
      seaFighters: 0,
      landForce: {},
      landPlanes: {},
      ...overrides.defender,
    },
    priorityMode: 'militaristic',
    ensureCapture: overrides.ensureCapture ?? false,
    trialCount: overrides.trialCount ?? 1,
  };
}

describe('transport capacity and validation', () => {
  it('computes boats needed under the strict rule (2 inf OR 1 art OR 1 tank)', () => {
    expect(transportsNeeded({ infantry: 4 })).toBe(2);
    expect(transportsNeeded({ infantry: 5 })).toBe(3);
    expect(transportsNeeded({ infantry: 2, artillery: 1, armor: 2 })).toBe(4);
  });

  it('flags over-capacity sea cargo and over-cap defending sea fighters', () => {
    const errors = amphibiousValidationErrors(
      makeInput({
        attacker: { seaTransports: 1, seaCargo: { infantry: 2, armor: 1 } },
        defender: { seaFleet: { carrier: 1 }, seaFighters: 3 },
      }),
    );
    expect(errors).toHaveLength(2);
  });

  it('flags over-capacity held-back cargo separately', () => {
    const errors = amphibiousValidationErrors(
      makeInput({
        attacker: { heldBackTransports: 1, heldBackCargo: { infantry: 2, armor: 1 } },
      }),
    );
    expect(errors.some((e) => e.includes('held-back transports'))).toBe(true);
  });

  it('accepts a sound loadout', () => {
    const errors = amphibiousValidationErrors(
      makeInput({
        attacker: { seaTransports: 3, seaCargo: { infantry: 4, armor: 1 } },
        defender: { seaFleet: { carrier: 1 }, seaFighters: 2 },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('flags preserved transports exceeding the sea-battle pool', () => {
    const errors = amphibiousValidationErrors(
      makeInput({
        attacker: { seaTransports: 2, preserveTransports: 3 },
      }),
    );
    expect(errors.some((e) => e.includes('Preserved'))).toBe(true);
  });
});

describe('buildBoatManifest — sacrifice order', () => {
  it('orders boats empty → half infantry → full infantry → artillery → tank', () => {
    const manifest = buildBoatManifest(5, { infantry: 3, artillery: 1, armor: 1 });
    expect(manifest).toEqual([
      {}, // 5 boats, 4 used
      { infantry: 1 },
      { infantry: 2 },
      { artillery: 1 },
      { armor: 1 },
    ]);
  });
});

describe('runAmphibiousCalculation — Monte Carlo trials', () => {
  it('sunk transports drown their cargo; survivors land and fight', () => {
    // Sea battle: 1 attacking destroyer + 2 loaded transports (1 inf each?
    // no — 2 transports carrying 3 infantry: manifest = [{inf 1},{inf 2}])
    // vs 1 defending submarine.
    // Sub first-strike is negated by the destroyer.
    const input = makeInput({
      attacker: {
        seaFleet: { destroyer: 1 },
        seaTransports: 2,
        seaCargo: { infantry: 3 },
      },
      defender: {
        seaFleet: { submarine: 1 },
        landForce: { infantry: 1 },
      },
    });
    const rng = createScriptedRng([
      // Sea round 1 (defending subs get no first strike; transports don't roll):
      3, // destroyer attack: hit — the sub (only defender) dies after firing
      1, // submarine defense: hit — militaristic attacker sacrifices a transport
      //    (attack 0 < destroyer 3); the half-loaded boat {infantry: 1} sinks.
      // Sea battle over: defender fleet destroyed → zone controlled.
      // Land battle: 2 landed infantry (3 - 1 drowned) vs 1 defending infantry.
      6, 6, 6, // land round 1: both attacker infantry miss, defender misses
      1, 6, 6, // land round 2: first attacker infantry hits, second misses, defender misses
    ]);
    const result = runAmphibiousCalculation(input, UNIT_CATALOG, rng);

    expect(result.simulation.seaControlledPct).toBe(100);
    expect(result.simulation.attackerWinPct).toBe(100);
    // IPC: attacker lost 1 transport (8) + 1 drowned infantry (3) = 11.
    expect(result.simulation.totalIpcLoss.attacker).toBe(11);
    // Defender lost 1 submarine (8) + 1 infantry (3) = 11.
    expect(result.simulation.totalIpcLoss.defender).toBe(11);
  });

  it('a lost sea battle keeps every ship inert but the adjacent-territory troops still attack', () => {
    const input = makeInput({
      attacker: {
        seaFleet: { submarine: 1 },
        seaTransports: 1,
        seaCargo: { infantry: 2 },
        coverShips: { battleship: 1 },
        landTroops: { armor: 1 },
      },
      defender: {
        seaFleet: { destroyer: 1 },
        landForce: { infantry: 1 },
      },
    });
    const rng = createScriptedRng([
      // Sea round 1 (sub's first strike NEGATED by the defending destroyer;
      // the transport has attack 0 and never rolls):
      6, // sub attack misses
      3, // destroyer hits → attacker sacrifices the transport (attack 0 dies first) — cargo drowns
      // Sea round 2:
      6, // sub misses again
      3, // destroyer hits → sub dies; sea battle LOST (defender fleet alive)
      // No cover shots (the held-back battleship is inert). Land battle:
      1, // armor attack hits
      6, // infantry defense misses — defender destroyed
    ]);
    const result = runAmphibiousCalculation(input, UNIT_CATALOG, rng);

    expect(result.simulation.seaControlledPct).toBe(0);
    // The adjacent-territory armor still captured the territory.
    expect(result.simulation.attackerWinPct).toBe(100);
    // Attacker lost: sub (8) + transport (8) + 2 drowned infantry (6) = 22.
    // The held-back battleship is untouched.
    expect(result.simulation.totalIpcLoss.attacker).toBe(22);
    expect(result.simulation.totalIpcLoss.defender).toBe(3);
  });

  it('a mutual sea wipe-out still clears the zone for held-back ships (tie = control)', () => {
    const input = makeInput({
      attacker: {
        seaFleet: { submarine: 1 },
        seaTransports: 1,
        seaCargo: { armor: 1 },
        coverShips: { destroyer: 1 },
      },
      defender: {
        seaFleet: { submarine: 1 },
        landForce: { infantry: 1 },
      },
    });
    const rng = createScriptedRng([
      // Sea round 1 — attacking sub first-strike (no defending destroyer):
      2, // first strike hits: defender sub dies immediately (no return fire)
      //    Defender fleet destroyed... but wait, first-strike victims are
      //    removed before firing, so the battle ends with the defender wiped
      //    and the attacker's sub + transport alive. Control = yes.
      // Cover shots from the held-back destroyer (needs <=3):
      2, // cover shot hits → the defending infantry dies instantly
      // Land battle: 1 landed armor vs nothing — attacker wins without a roll.
    ]);
    const result = runAmphibiousCalculation(input, UNIT_CATALOG, rng);

    expect(result.simulation.seaControlledPct).toBe(100);
    expect(result.simulation.attackerWinPct).toBe(100);
    expect(result.simulation.totalIpcLoss.attacker).toBe(0);
    expect(result.simulation.totalIpcLoss.defender).toBe(8 + 3);
  });

  it('held-back cargo — safe from combat but still withheld — never lands without sea control', () => {
    // The held-back armor never risks a single hit (only the lone attacking
    // submarine enters the sea battle), but losing the sea battle still
    // strands it: no adjacent-territory troops means the attacker fights
    // the land battle with an empty force and auto-loses.
    const input = makeInput({
      attacker: {
        seaFleet: { submarine: 1 },
        heldBackTransports: 1,
        heldBackCargo: { armor: 1 },
      },
      defender: {
        seaFleet: { destroyer: 1 },
        landForce: { infantry: 1 },
      },
    });
    const rng = createScriptedRng([
      6, // submarine attack misses
      3, // destroyer defense hits — the lone submarine dies, sea battle lost
      // Land battle never rolls: the attacker has no units at all (the
      // held-back armor didn't land, no adjacent troops were assigned).
    ]);
    const result = runAmphibiousCalculation(input, UNIT_CATALOG, rng);

    expect(result.simulation.seaControlledPct).toBe(0);
    expect(result.simulation.defenderWinPct).toBe(100);
    // Only the submarine died — the held-back armor was never in danger,
    // it simply never made it ashore.
    expect(result.simulation.totalIpcLoss.attacker).toBe(8);
    expect(result.simulation.totalIpcLoss.defender).toBe(0);
  });

  it('held-back cargo lands untouched alongside surviving sea cargo', () => {
    const input = makeInput({
      attacker: {
        seaFleet: { destroyer: 1 },
        seaTransports: 1,
        seaCargo: { infantry: 2 },
        heldBackTransports: 1,
        heldBackCargo: { armor: 1 },
      },
      defender: {
        landForce: { infantry: 1 },
      },
    });
    const rng = createScriptedRng([
      // No defender fleet: zone starts clear, no sea rolls at all.
      // Land battle: 2 sea-landed infantry + 1 held-back armor (3 attacker
      // rolls) vs 1 defender infantry (1 roll).
      1, 6, 6, // round 1: first attacker infantry hits, second infantry and armor miss
      6, // round 1: defender infantry misses — it was already the only hit needed, dies
    ]);
    const result = runAmphibiousCalculation(input, UNIT_CATALOG, rng);

    expect(result.simulation.seaControlledPct).toBe(100);
    expect(result.simulation.attackerWinPct).toBe(100);
    // Nothing was ever at risk: no transport, no cargo lost.
    expect(result.simulation.totalIpcLoss.attacker).toBe(0);
  });
});

describe('runExpectedAmphibious — deterministic chain', () => {
  it('bombards with cover ships and lands cargo when the defender has no fleet', () => {
    const input = makeInput({
      attacker: {
        seaTransports: 1,
        seaCargo: { infantry: 2 },
        coverShips: { battleship: 1 },
      },
      defender: {
        landForce: { infantry: 2 },
      },
    });
    const expected = runExpectedAmphibious(input, UNIT_CATALOG);

    expect(expected.sea).toBeNull();
    expect(expected.seaControlled).toBe(true);
    // Cover shot: 4/6 expected kills on the defending infantry before round 1.
    expect(expected.bombardmentLosses.infantry).toBeCloseTo(4 / 6, 4);
    expect(expected.land.attackerStart.infantry).toBe(2);
    expect(expected.land.defenderStart.infantry).toBe(2);
  });

  it('loses fractional cargo with fractional transports and withholds cargo without sea control', () => {
    // Attacker sub + 1 loaded transport vs a defending destroyer the EV
    // model cannot crack fast enough — the mushy sea outcome leaves the
    // defender afloat, so nothing lands.
    const input = makeInput({
      attacker: {
        seaFleet: { submarine: 1 },
        seaTransports: 1,
        seaCargo: { infantry: 2 },
        landTroops: { armor: 1 },
      },
      defender: {
        seaFleet: { destroyer: 2, battleship: 1 },
        landForce: { infantry: 1 },
      },
    });
    const expected = runExpectedAmphibious(input, UNIT_CATALOG);

    expect(expected.seaControlled).toBe(false);
    // Only the adjacent-territory armor fights the land battle.
    expect(expected.land.attackerStart.infantry).toBeUndefined();
    expect(expected.land.attackerStart.armor).toBe(1);
    // No cover shots without sea control.
    expect(Object.keys(expected.bombardmentLosses)).toHaveLength(0);
  });

  it('held-back transports never enter the sea battle Force', () => {
    const input = makeInput({
      attacker: {
        seaTransports: 1,
        seaCargo: {},
        heldBackTransports: 1,
        heldBackCargo: { armor: 1 },
      },
      defender: {
        seaFleet: { submarine: 1 },
        landForce: { infantry: 1 },
      },
    });
    const expected = runExpectedAmphibious(input, UNIT_CATALOG);

    expect(expected.sea).not.toBeNull();
    expect(expected.sea!.attackerStart.transport).toBe(1);
  });

  it('held-back cargo merges in untouched alongside surviving sea cargo when the zone is controlled', () => {
    const input = makeInput({
      attacker: {
        seaTransports: 1,
        seaCargo: { infantry: 2 },
        heldBackTransports: 1,
        heldBackCargo: { armor: 1 },
      },
      defender: {
        landForce: { infantry: 1 },
      },
    });
    const expected = runExpectedAmphibious(input, UNIT_CATALOG);

    expect(expected.seaControlled).toBe(true);
    expect(expected.land.attackerStart.infantry).toBe(2);
    expect(expected.land.attackerStart.armor).toBe(1);
  });

  it('preserved transports absorb no damage until the free portion and other ships are exhausted', () => {
    // Free transport capacity (2 - 1 preserved = 1) plus the destroyer both
    // sit ahead of the preserved transport in the sacrifice order. 4
    // defending submarines deal (4 × 2)/6 = 4/3 expected hits round 1 —
    // enough to fully drain the 1 free transport (1 hit) and spill 1/3 onto
    // the destroyer, leaving the preserved transport untouched.
    const input = makeInput({
      attacker: {
        seaFleet: { destroyer: 1 },
        seaTransports: 2,
        preserveTransports: 1,
        seaCargo: { armor: 2 },
      },
      defender: {
        seaFleet: { submarine: 4 },
        landForce: { infantry: 1 },
      },
    });
    const expected = runExpectedAmphibious(input, UNIT_CATALOG);

    const round1 = expected.sea!.rounds[0];
    expect(round1.attacker.transport).toBeCloseTo(1, 4);
    expect(round1.attacker.destroyer).toBeCloseTo(2 / 3, 4);
  });
});
