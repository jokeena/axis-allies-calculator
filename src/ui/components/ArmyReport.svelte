<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import { UNIT_LABELS, UNIT_DISPLAY_ORDER } from '../unitLabels';
  import { formatCount } from '../format';
  import type { Side, UnitLossCounts, UnitType } from '../../engine';

  let {
    side,
    start,
    survivors,
    specialNote,
  }: {
    side: Side;
    start: UnitLossCounts;
    survivors: UnitLossCounts;
    specialNote: string | null;
  } = $props();

  interface ReportRow {
    type: UnitType;
    committed: number;
    remaining: number;
  }

  /** Rows follow the Order of Battle listing, not size or fall order. */
  const rows = $derived(
    UNIT_DISPLAY_ORDER.filter((type) => (start[type] ?? 0) > 0).map((type): ReportRow => {
      const committed = start[type] ?? 0;
      return { type, committed, remaining: Math.max(0, survivors[type] ?? 0) };
    }),
  );
</script>

<div class="report">
  <h3 class={side}>{side === 'attacker' ? 'Attacker' : 'Defender'}</h3>

  <h4>Expected surviving force</h4>
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
              style:width="{Math.min(100, (row.remaining / row.committed) * 100)}%"
            ></span>
          </span>
          <span class="count">{formatCount(row.remaining)} / {row.committed}</span>
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

  li {
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
