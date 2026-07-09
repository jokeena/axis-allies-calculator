<script lang="ts">
  let {
    attackerWinPct,
    defenderWinPct,
    tiePct,
    standoffPct,
    clearedNotCapturedPct,
    ensureCapture,
    seaControlledPct = null,
  }: {
    attackerWinPct: number;
    defenderWinPct: number;
    tiePct: number;
    standoffPct: number;
    clearedNotCapturedPct: number;
    ensureCapture: boolean;
    /** Amphibious battles only: % of trials where the sea zone was secured. */
    seaControlledPct?: number | null;
  } = $props();

  function fmt(pct: number): string {
    return `${pct.toFixed(1)}%`;
  }

  const showStandoff = $derived(standoffPct > 0.05);
  const showCleared = $derived(clearedNotCapturedPct > 0.05);
</script>

<div class="tiles">
  {#if seaControlledPct !== null}
    <div class="tile sea">
      <span class="label">Sea zone secured</span>
      <span class="value">{fmt(seaControlledPct)}</span>
    </div>
  {/if}
  <div class="tile attacker">
    <span class="label">{ensureCapture ? 'Attacker captures' : 'Attacker wins'}</span>
    <span class="value">{fmt(attackerWinPct)}</span>
  </div>
  <div class="tile defender">
    <span class="label">Defender wins</span>
    <span class="value">{fmt(defenderWinPct)}</span>
  </div>
  <div class="tile tie">
    <span class="label">Mutual annihilation</span>
    <span class="value">{fmt(tiePct)}</span>
  </div>
  {#if showStandoff}
    <div class="tile standoff">
      <span class="label">Standoff</span>
      <span class="value">{fmt(standoffPct)}</span>
    </div>
  {/if}
  {#if showCleared}
    <div class="tile cleared">
      <span class="label">Cleared, not captured</span>
      <span class="value">{fmt(clearedNotCapturedPct)}</span>
    </div>
  {/if}
</div>

<div
  class="bar"
  role="img"
  aria-label="Attacker {fmt(attackerWinPct)}, defender {fmt(defenderWinPct)}, tie {fmt(tiePct)}, standoff {fmt(standoffPct)}, cleared not captured {fmt(clearedNotCapturedPct)}"
>
  <span class="segment attacker" style:width="{attackerWinPct}%"></span>
  <span class="segment defender" style:width="{defenderWinPct}%"></span>
  <span class="segment tie" style:width="{tiePct}%"></span>
  {#if showStandoff}
    <span class="segment standoff" style:width="{standoffPct}%"></span>
  {/if}
  {#if showCleared}
    <span class="segment cleared" style:width="{clearedNotCapturedPct}%"></span>
  {/if}
</div>

{#if showStandoff}
  <p class="footnote">
    Standoff: both sides survive but can no longer hit each other (e.g. aircraft vs. submarines
    with no destroyer present).
  </p>
{/if}
{#if showCleared}
  <p class="footnote">
    Cleared, not captured: the defender was destroyed, but only aircraft survived &mdash; planes
    cannot claim territory.
  </p>
{/if}

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.85rem 1rem;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-left-width: 3px;
  }

  .tile.attacker {
    border-left-color: var(--attacker);
  }

  .tile.defender {
    border-left-color: var(--defender);
  }

  .tile.tie {
    border-left-color: var(--neutral);
  }

  .tile.standoff {
    border-left-color: var(--axis);
  }

  .tile.cleared {
    border-left-color: var(--brass);
  }

  .tile.sea {
    border-left-color: var(--brass);
  }

  .label {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--text-secondary);
  }

  .value {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.9rem;
    line-height: 1;
    color: var(--text-primary);
  }

  .bar {
    display: flex;
    height: 12px;
    margin-top: 1rem;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
  }

  .segment {
    height: 100%;
  }

  .segment + .segment {
    margin-left: 2px;
  }

  .segment.attacker {
    background: var(--attacker);
  }

  .segment.defender {
    background: var(--defender);
  }

  .segment.tie {
    background: var(--neutral);
  }

  .segment.standoff {
    background: var(--axis);
  }

  .segment.cleared {
    background: var(--brass);
  }

  .footnote {
    margin: 0.5rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
</style>
