<script lang="ts">
  import UnitCountRow from './UnitCountRow.svelte';
  import type { ArmyComposition, UnitType } from '../../engine';

  let { attacker, defender }: { attacker: ArmyComposition; defender: ArmyComposition } = $props();

  const landRows: Array<{ type: UnitType; label: string }> = [
    { type: 'infantry', label: 'Infantry' },
    { type: 'artillery', label: 'Artillery' },
    { type: 'armor', label: 'Armor' },
  ];
  const airRows: Array<{ type: UnitType; label: string }> = [
    { type: 'fighter', label: 'Fighter' },
    { type: 'bomber', label: 'Bomber' },
  ];
  const seaRows: Array<{ type: UnitType; label: string }> = [
    { type: 'transport', label: 'Transport' },
    { type: 'submarine', label: 'Submarine' },
    { type: 'destroyer', label: 'Destroyer' },
    { type: 'battleship', label: 'Battleship' },
    { type: 'carrier', label: 'Aircraft Carrier' },
  ];
</script>

{#snippet column(title: string, side: 'attacker' | 'defender', composition: ArmyComposition, showAAGun: boolean)}
  <section class="column">
    <h2 class={side}>{title}</h2>
    <h3>Land</h3>
    {#each landRows as row (row.type)}
      <UnitCountRow type={row.type} label={row.label} bind:value={composition[row.type]} />
    {/each}
    {#if showAAGun}
      <UnitCountRow type="aaGun" label="Anti-Aircraft Gun" max={1} bind:value={composition.aaGun} />
    {/if}
    <h3>Air</h3>
    {#each airRows as row (row.type)}
      <UnitCountRow type={row.type} label={row.label} bind:value={composition[row.type]} />
    {/each}
    <h3>Sea</h3>
    {#each seaRows as row (row.type)}
      <UnitCountRow type={row.type} label={row.label} bind:value={composition[row.type]} />
    {/each}
  </section>
{/snippet}

<div class="columns">
  {@render column('Attacker', 'attacker', attacker, false)}
  {@render column('Defender', 'defender', defender, true)}
</div>

<style>
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem 2.5rem;
  }

  h2 {
    margin: 0 0 0.6rem;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-bottom: 0.35rem;
    border-bottom: 2px solid currentColor;
  }

  h2.attacker {
    color: var(--attacker);
  }

  h2.defender {
    color: var(--defender);
  }

  h3 {
    margin: 0.9rem 0 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--gridline);
    padding-bottom: 0.25rem;
  }
</style>
