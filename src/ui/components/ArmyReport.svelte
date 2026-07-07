<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import { UNIT_LABELS } from '../unitLabels';
  import { participatesInBattle } from '../participation';
  import { formatCount } from '../format';
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

  const lostByType = $derived.by(() => {
    const totals: Partial<Record<UnitType, number>> = {};
    for (const phase of PHASES) {
      for (const roundRow of result.roundByRoundLosses[phase]) {
        const losses = side === 'attacker' ? roundRow.attackerLosses : roundRow.defenderLosses;
        for (const [type, count] of Object.entries(losses) as [UnitType, number][]) {
          totals[type] = (totals[type] ?? 0) + count;
        }
      }
    }
    return totals;
  });

  const committedTypes = $derived(
    ALL_UNIT_TYPES.filter(
      (type) =>
        !UNIT_CATALOG[type].isAAGun &&
        (composition[type] ?? 0) > 0 &&
        participatesInBattle(type, context),
    ),
  );

  /** Survivors, largest remaining force first. */
  const survivorRows = $derived(
    committedTypes
      .map((type) => ({
        type,
        // Clamp: float accumulation can land a hair below zero.
        remaining: Math.max(0, composition[type] - (lostByType[type] ?? 0)),
      }))
      .sort((a, b) => b.remaining - a.remaining),
  );

  /** Casualties, in the order units typically fall (naval phase first). */
  const casualtyRows = $derived.by(() => {
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
    for (const type of committedTypes) {
      if (!seen.has(type)) {
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

  /** Special-loss footnote: AA fire downs attacker planes; bombardment hits defenders. */
  const specialNote = $derived.by(() => {
    const source = side === 'attacker' ? result.aaLosses : result.bombardmentLosses;
    const parts = (Object.entries(source) as [UnitType, number][])
      .filter(([, count]) => count >= 0.005)
      .map(([type, count]) => `${formatCount(count, 2)} ${UNIT_LABELS[type]}`);
    if (parts.length === 0) return null;
    return side === 'attacker'
      ? `incl. ${parts.join(', ')} to AA fire`
      : `incl. ${parts.join(', ')} to bombardment cover shots`;
  });
</script>

<div class="report">
  <h3 class={side}>{side === 'attacker' ? 'Attacker' : 'Defender'}</h3>

  <h4>Expected surviving force</h4>
  {#if survivorRows.length === 0}
    <p class="empty">No units committed.</p>
  {:else}
    <ol class="survivors">
      {#each survivorRows as row (row.type)}
        <li>
          <span class="icon {side}"><UnitIcon type={row.type} size={16} /></span>
          <span class="name">{UNIT_LABELS[row.type]}</span>
          <span class="value">{formatCount(row.remaining)}</span>
        </li>
      {/each}
    </ol>
  {/if}

  <h4>Expected casualties</h4>
  {#if casualtyRows.length === 0}
    <p class="empty">No units committed.</p>
  {:else}
    <ol class="casualties">
      {#each casualtyRows as row (row.type)}
        <li>
          <span class="icon {side}"><UnitIcon type={row.type} size={16} /></span>
          <span class="name">{UNIT_LABELS[row.type]}</span>
          <span class="bar-track">
            <span
              class="bar-fill {side}"
              style:width="{Math.min(100, (row.lost / row.committed) * 100)}%"
            ></span>
          </span>
          <span class="count">{formatCount(row.lost)} / {row.committed}</span>
        </li>
      {/each}
    </ol>
    {#if specialNote}
      <p class="special-note">{specialNote}</p>
    {/if}
  {/if}
</div>

<style>
  .report {
    min-width: 0;
  }

  h3 {
    margin: 0 0 0.7rem;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-bottom: 0.3rem;
    border-bottom: 2px solid currentColor;
  }

  h3.attacker {
    color: var(--attacker);
  }

  h3.defender {
    color: var(--defender);
  }

  h4 {
    margin: 0.9rem 0 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-secondary);
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .survivors li {
    display: grid;
    grid-template-columns: 1.3rem 1fr auto;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.85rem;
  }

  .survivors .value {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .casualties li {
    display: grid;
    grid-template-columns: 1.3rem minmax(6rem, auto) 1fr auto;
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

  .special-note {
    margin: 0.4rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
