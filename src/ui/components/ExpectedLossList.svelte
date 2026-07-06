<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import { UNIT_LABELS } from '../unitLabels';
  import { ALL_UNIT_TYPES, UNIT_CATALOG } from '../../engine';
  import type {
    AggregatedResult,
    ArmyComposition,
    BattleContext,
    Phase,
    Side,
    UnitType,
  } from '../../engine';

  let {
    side,
    composition,
    result,
    context,
  }: {
    side: Side;
    composition: ArmyComposition;
    result: AggregatedResult;
    context: BattleContext;
  } = $props();

  const PHASES: Phase[] = ['naval', 'land'];

  /** Only unit types that actually take part in this battle get a row —
   * e.g. a defender's stray navy in a pure land fight sits out entirely. */
  function participates(type: UnitType): boolean {
    const domain = UNIT_CATALOG[type].domain;
    if (context.type === 'amphibious') return true;
    if (context.type === 'naval') return domain === 'sea' || domain === 'air';
    return domain === 'land' || domain === 'air';
  }

  interface LossRow {
    type: UnitType;
    committed: number;
    lost: number;
  }

  const rows = $derived.by((): LossRow[] => {
    const lostByType: Partial<Record<UnitType, number>> = {};
    for (const phase of PHASES) {
      for (const roundRow of result.roundByRoundLosses[phase]) {
        const losses = side === 'attacker' ? roundRow.attackerLosses : roundRow.defenderLosses;
        for (const [type, count] of Object.entries(losses) as [UnitType, number][]) {
          lostByType[type] = (lostByType[type] ?? 0) + count;
        }
      }
    }

    // Order: units that die, in the order they typically fall (naval phase
    // precedes land), then committed-but-typically-surviving units last.
    const order: UnitType[] = [];
    const seen = new Set<UnitType>();
    for (const phase of PHASES) {
      for (const entry of result.deathOrder[side][phase]) {
        if (!seen.has(entry.unitType)) {
          seen.add(entry.unitType);
          order.push(entry.unitType);
        }
      }
    }
    for (const type of ALL_UNIT_TYPES) {
      // AA guns are skipped: they can never be chosen as a casualty, so a
      // "0.0 lost" row for them is noise rather than information.
      if (UNIT_CATALOG[type].isAAGun) continue;
      if ((composition[type] ?? 0) > 0 && participates(type) && !seen.has(type)) {
        seen.add(type);
        order.push(type);
      }
    }

    return order
      .filter((type) => (composition[type] ?? 0) > 0)
      .map((type) => ({
        type,
        committed: composition[type],
        lost: lostByType[type] ?? 0,
      }));
  });

  function fmtLost(lost: number): string {
    return lost.toFixed(1);
  }
</script>

<div class="list-block">
  <h3 class={side}>{side === 'attacker' ? 'Attacker' : 'Defender'} losses</h3>
  {#if rows.length === 0}
    <p class="empty">No units committed.</p>
  {:else}
    <ol>
      {#each rows as row (row.type)}
        <li>
          <span class="icon {side}"><UnitIcon type={row.type} size={16} /></span>
          <span class="name">{UNIT_LABELS[row.type]}</span>
          <span class="bar-track">
            <span
              class="bar-fill {side}"
              style:width="{Math.min(100, (row.lost / row.committed) * 100)}%"
            ></span>
          </span>
          <span class="count">{fmtLost(row.lost)} / {row.committed}</span>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .list-block {
    min-width: 0;
  }

  h3 {
    margin: 0 0 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  h3.attacker {
    color: var(--attacker);
  }

  h3.defender {
    color: var(--defender);
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  li {
    display: grid;
    grid-template-columns: 1.3rem minmax(6.5rem, auto) 1fr auto;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.85rem;
  }

  .icon {
    display: inline-flex;
  }

  .icon.attacker {
    color: var(--attacker);
  }

  .icon.defender {
    color: var(--defender);
  }

  .name {
    color: var(--text-primary);
  }

  .bar-track {
    height: 7px;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    overflow: hidden;
  }

  .bar-fill {
    display: block;
    height: 100%;
  }

  .bar-fill.attacker {
    background: var(--attacker);
  }

  .bar-fill.defender {
    background: var(--defender);
  }

  .count {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
