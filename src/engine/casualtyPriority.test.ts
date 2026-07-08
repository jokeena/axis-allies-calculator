import { describe, expect, it } from 'vitest';
import { applyHits } from './casualtyPriority';
import { UNIT_CATALOG } from './unitCatalog';
import type { UnitInstance } from './types';

function unit(type: UnitInstance['type'], side: UnitInstance['side'], hitsTaken = 0): UnitInstance {
  return { id: Math.random(), type, side, domain: UNIT_CATALOG[type].domain, hitsTaken };
}

describe('applyHits', () => {
  it('militaristic mode sacrifices the lowest-value unit first', () => {
    const infantry = unit('infantry', 'attacker'); // attack 1
    const armor = unit('armor', 'attacker'); // attack 3
    const destroyed = applyHits([infantry, armor], 1, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([infantry]);
  });

  it('economical mode sacrifices the cheapest unit first regardless of value', () => {
    const infantry = unit('infantry', 'attacker'); // cost 3, attack 1
    const armor = unit('armor', 'attacker'); // cost 5, attack 3
    const destroyed = applyHits([infantry, armor], 1, UNIT_CATALOG, 'economical');
    expect(destroyed).toEqual([infantry]);
  });

  it('militaristic ties break toward keeping the pricier unit alive', () => {
    // artillery (cost 4, value 2) vs a defending infantry+artillery pairing
    // scenario isn't needed here — use two defense-2 units with different
    // costs: infantry (def 2, cost 3) vs armor (def 2, cost 5).
    const infantry = unit('infantry', 'defender');
    const armor = unit('armor', 'defender');
    const destroyed = applyHits([infantry, armor], 1, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([infantry]); // cheaper one sacrificed on the value tie
  });

  it('economical ties break toward keeping the highest-hitting unit alive', () => {
    // transport (cost 8, attack 0) vs submarine (cost 8, attack 2) as attackers
    const transport = unit('transport', 'attacker');
    const submarine = unit('submarine', 'attacker');
    const destroyed = applyHits([transport, submarine], 1, UNIT_CATALOG, 'economical');
    expect(destroyed).toEqual([transport]); // lower attack value sacrificed on the cost tie
  });

  it('context-dependent value: armor ranks by attack(3) when attacking, defense(2) when defending', () => {
    // As an attacker, armor (3) should be sacrificed AFTER infantry (1).
    const attackingInfantry = unit('infantry', 'attacker');
    const attackingArmor = unit('armor', 'attacker');
    expect(applyHits([attackingInfantry, attackingArmor], 1, UNIT_CATALOG, 'militaristic')).toEqual([
      attackingInfantry,
    ]);

    // As a defender, armor's value drops to 2 (defense), tying infantry's
    // defense of 2 — so the tie-break (cost) decides, sacrificing infantry
    // (cheaper) first even though armor costs more overall.
    const defendingInfantry = unit('infantry', 'defender');
    const defendingArmor = unit('armor', 'defender');
    expect(applyHits([defendingInfantry, defendingArmor], 1, UNIT_CATALOG, 'militaristic')).toEqual([
      defendingInfantry,
    ]);
  });

  it('AA guns are never selected as casualties even if they are the only candidate', () => {
    const aaGun = unit('aaGun', 'defender');
    const destroyed = applyHits([aaGun], 1, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([]);
    expect(aaGun.hitsTaken).toBe(0);
  });

  it('soaks hits into an undamaged battleship before sacrificing anything else', () => {
    const battleship = unit('battleship', 'defender');
    const infantry = unit('infantry', 'defender');
    const destroyed = applyHits([battleship, infantry], 1, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([]); // battleship just damaged, not destroyed
    expect(battleship.hitsTaken).toBe(1);
    expect(infantry.hitsTaken).toBe(0);
  });

  it('a second hit sinks an already-damaged battleship', () => {
    const battleship = unit('battleship', 'defender', 1); // already damaged
    const destroyed = applyHits([battleship], 1, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([battleship]);
  });

  it('protected units are sacrificed only after everything else is gone', () => {
    const freeTransport = unit('transport', 'attacker');
    const preservedTransport = { ...unit('transport', 'attacker'), protected: true };
    const destroyer = unit('destroyer', 'attacker');

    // One hit: the free transport (attack 0, lowest value) dies first even
    // though it's not marked protected — same as today's default ordering.
    const firstHit = applyHits(
      [freeTransport, preservedTransport, destroyer],
      1,
      UNIT_CATALOG,
      'militaristic',
    );
    expect(firstHit).toEqual([freeTransport]);
    expect(preservedTransport.hitsTaken).toBe(0);
    expect(destroyer.hitsTaken).toBe(0);

    // A second hit lands on the destroyer (higher value than the transport,
    // but the preserved transport is pushed to the very back of the queue).
    const secondHit = applyHits([preservedTransport, destroyer], 1, UNIT_CATALOG, 'militaristic');
    expect(secondHit).toEqual([destroyer]);
    expect(preservedTransport.hitsTaken).toBe(0);

    // Only once nothing else is left does the preserved transport take a hit.
    const thirdHit = applyHits([preservedTransport], 1, UNIT_CATALOG, 'militaristic');
    expect(thirdHit).toEqual([preservedTransport]);
  });

  it('spreads multiple hits across multiple undamaged battleships before hitting anything else', () => {
    const battleshipA = unit('battleship', 'defender');
    const battleshipB = unit('battleship', 'defender');
    const infantry = unit('infantry', 'defender');
    const destroyed = applyHits([battleshipA, battleshipB, infantry], 2, UNIT_CATALOG, 'militaristic');
    expect(destroyed).toEqual([]);
    expect(battleshipA.hitsTaken).toBe(1);
    expect(battleshipB.hitsTaken).toBe(1);
    expect(infantry.hitsTaken).toBe(0);
  });
});

