<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import { UNIT_LABELS } from '../unitLabels';
  import type { AdvisorRow, Side } from '../../engine';

  let {
    advice,
    advising,
    baselineAttackerPct,
    baselineDefenderPct,
    ensureCapture,
    onAdvise,
  }: {
    advice: AdvisorRow[] | null;
    advising: boolean;
    baselineAttackerPct: number;
    baselineDefenderPct: number;
    ensureCapture: boolean;
    onAdvise: () => void;
  } = $props();

  interface DisplayRow {
    row: AdvisorRow;
    /** The metric shown for this row: attacker win% for attacker
     * reinforcements, defender win% for defender reinforcements. */
    pct: number;
    delta: number;
  }

  function rowsFor(side: Side): DisplayRow[] {
    if (!advice) return [];
    const baseline = side === 'attacker' ? baselineAttackerPct : baselineDefenderPct;
    const rows = advice
      .filter((r) => r.side === side)
      .map((row) => {
        const pct = side === 'attacker' ? row.attackerWinPct : row.defenderWinPct;
        return { row, pct, delta: pct - baseline };
      });
    // Biggest gain in the reinforced side's own odds first.
    rows.sort((a, b) => b.delta - a.delta);
    return rows;
  }

  const attackerRows = $derived(rowsFor('attacker'));
  const defenderRows = $derived(rowsFor('defender'));

  function fmtDelta(delta: number): string {
    const magnitude = Math.abs(delta).toFixed(1);
    return delta >= 0 ? `+${magnitude}` : `−${magnitude}`;
  }

  const attackerMetricLabel = $derived(ensureCapture ? 'capture' : 'win');
</script>

<div class="advisor">
  {#if !advice && !advising}
    <button class="advise-button" onclick={onAdvise}>Advise reinforcements</button>
    <p class="hint">
      Re-runs the simulation with +1 of each unit type to show what changes the odds most.
    </p>
  {:else if advising}
    <p class="working">Testing reinforcements&hellip;</p>
  {:else if advice}
    <div class="tables">
      <div class="table-block">
        <h4 class="attacker">Attacker reinforcements</h4>
        <table>
          <tbody>
            {#each attackerRows as { row, pct, delta } (row.type)}
              <tr>
                <td class="unit">
                  <span class="icon attacker"><UnitIcon type={row.type} size={14} /></span>
                  +1 {UNIT_LABELS[row.type]}
                </td>
                <td class="pct">{pct.toFixed(1)}%</td>
                <td class="delta" class:good={delta > 0}>{fmtDelta(delta)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="table-block">
        <h4 class="defender">Defender reinforcements</h4>
        <table>
          <tbody>
            {#each defenderRows as { row, pct, delta } (row.type)}
              <tr>
                <td class="unit">
                  <span class="icon defender"><UnitIcon type={row.type} size={14} /></span>
                  +1 {UNIT_LABELS[row.type]}
                </td>
                <td class="pct">{pct.toFixed(1)}%</td>
                <td class="delta" class:good={delta > 0}>{fmtDelta(delta)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    <p class="hint">
      Attacker {attackerMetricLabel}% shown for attacker reinforcements (baseline
      {baselineAttackerPct.toFixed(1)}%); defender win% shown for defender reinforcements
      (baseline {baselineDefenderPct.toFixed(1)}%) &mdash; each with a single +1 unit added.
    </p>
  {/if}
</div>

<style>
  .advisor {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--gridline);
  }

  .advise-button {
    padding: 0.5rem 1.25rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    border: 1px solid var(--brass);
    border-radius: 3px;
    background: transparent;
    color: var(--brass);
    cursor: pointer;
  }

  .advise-button:hover {
    background: rgba(201, 162, 39, 0.1);
  }

  .working {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    margin: 0;
  }

  .hint {
    margin: 0.5rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .tables {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem 2.5rem;
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

  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.85rem;
  }

  td {
    padding: 0.28rem 0.55rem;
    border-bottom: 1px solid var(--gridline);
  }

  .unit {
    color: var(--text-primary);
  }

  .icon {
    display: inline-flex;
    vertical-align: middle;
    margin-right: 0.3rem;
  }

  .icon.attacker {
    color: var(--attacker);
  }

  .icon.defender {
    color: var(--defender);
  }

  .pct {
    text-align: right;
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .delta {
    text-align: right;
    font-family: var(--font-mono);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .delta.good {
    color: var(--brass);
  }
</style>
