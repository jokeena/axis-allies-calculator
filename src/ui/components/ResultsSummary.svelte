<script lang="ts">
  let {
    attackerWinPct,
    defenderWinPct,
    tiePct,
  }: { attackerWinPct: number; defenderWinPct: number; tiePct: number } = $props();

  function fmt(pct: number): string {
    return `${pct.toFixed(1)}%`;
  }
</script>

<div class="tiles">
  <div class="tile attacker">
    <span class="label">Attacker wins</span>
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
</div>

<div class="bar" role="img" aria-label="Attacker {fmt(attackerWinPct)}, defender {fmt(defenderWinPct)}, tie {fmt(tiePct)}">
  <span class="segment attacker" style:width="{attackerWinPct}%"></span>
  <span class="segment defender" style:width="{defenderWinPct}%"></span>
  <span class="segment tie" style:width="{tiePct}%"></span>
</div>

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
</style>
