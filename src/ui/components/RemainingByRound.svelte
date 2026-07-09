<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import { UNIT_LABELS } from '../unitLabels';
  import { formatCount } from '../format';
  import type { ExpectedRound, Side, UnitLossCounts, UnitType } from '../../engine';

  let {
    side,
    types,
    start,
    rounds,
    preBattle,
  }: {
    side: Side;
    types: UnitType[];
    start: UnitLossCounts;
    rounds: ExpectedRound[];
    /** Side-specific pre-battle strike row: AA fire for the attacker,
     * bombardment cover shots for the defender. */
    preBattle?: { label: string; counts: UnitLossCounts };
  } = $props();

  interface TableRow {
    label: string;
    values: number[];
  }

  const rows = $derived.by((): TableRow[] => {
    const table: TableRow[] = [{ label: 'Start', values: types.map((t) => start[t] ?? 0) }];
    if (preBattle) {
      table.push({ label: preBattle.label, values: types.map((t) => preBattle.counts[t] ?? 0) });
    }
    for (const round of rounds) {
      const counts = side === 'attacker' ? round.attacker : round.defender;
      table.push({
        label: `Round ${round.round}`,
        values: types.map((t) => counts[t] ?? 0),
      });
    }
    return table;
  });
</script>

{#if types.length > 0}
  <div class="table-block">
    <h4 class={side}>{side === 'attacker' ? 'Attacker' : 'Defender'}</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="round-col" aria-label="Round"></th>
            {#each types as type (type)}
              <th title={UNIT_LABELS[type]}>
                <span class="icon {side}"><UnitIcon {type} size={15} /></span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row, i (i)}
            <tr>
              <td class="round-col">{row.label}</td>
              {#each row.values as value, j (j)}
                <td>{formatCount(value)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<style>
  .table-block {
    min-width: 0;
  }

  h4 {
    margin: 0 0 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  h4.attacker {
    color: var(--attacker);
  }

  h4.defender {
    color: var(--defender);
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    min-width: 100%;
  }

  th,
  td {
    padding: 0.28rem 0.55rem;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid var(--gridline);
  }

  td {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .round-col {
    text-align: left;
    color: var(--text-muted);
    letter-spacing: 0.05em;
  }

  .icon {
    display: inline-flex;
    vertical-align: middle;
  }

  .icon.attacker {
    color: var(--attacker);
  }

  .icon.defender {
    color: var(--defender);
  }

  tbody tr:first-child td {
    color: var(--text-primary);
  }
</style>
