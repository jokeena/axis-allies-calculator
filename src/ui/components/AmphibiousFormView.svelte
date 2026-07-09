<script lang="ts">
  import UnitCountRow from './UnitCountRow.svelte';
  import { transportsNeeded } from '../../engine';
  import type { AmphibiousForm } from '../stores/battleStore.svelte';

  let { form }: { form: AmphibiousForm } = $props();

  const seaBoatsNeeded = $derived(transportsNeeded(form.attacker.seaCargo));
  const seaOverCapacity = $derived(seaBoatsNeeded > form.attacker.seaTransports);

  const heldBackBoatsNeeded = $derived(transportsNeeded(form.attacker.heldBackCargo));
  const heldBackOverCapacity = $derived(heldBackBoatsNeeded > form.attacker.heldBackTransports);

  const preserveEnabled = $derived(form.attacker.preserveTransports > 0);

  function togglePreserve(event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    form.attacker.preserveTransports = checked ? Math.min(1, form.attacker.seaTransports) : 0;
  }

  // Keep the preserved count sane if the sea-battle transport pool shrinks
  // out from under it (e.g. the toggle stays on but the field disappears).
  $effect(() => {
    if (form.attacker.seaTransports === 0 && form.attacker.preserveTransports !== 0) {
      form.attacker.preserveTransports = 0;
    }
  });

  const fighterCap = $derived(2 * form.defender.seaFleet.carrier);
  const overFighterCap = $derived(form.defender.seaFighters > fighterCap);
</script>

<div class="columns">
  <section class="column">
    <h2 class="attacker">Attacker</h2>

    <h3>Sea battle fleet</h3>
    <UnitCountRow type="submarine" label="Submarine" bind:value={form.attacker.seaFleet.submarine} />
    <UnitCountRow type="destroyer" label="Destroyer" bind:value={form.attacker.seaFleet.destroyer} />
    <UnitCountRow type="battleship" label="Battleship" bind:value={form.attacker.seaFleet.battleship} />
    <UnitCountRow type="carrier" label="Aircraft Carrier" bind:value={form.attacker.seaFleet.carrier} />
    <UnitCountRow type="fighter" label="Fighter (sea battle)" bind:value={form.attacker.seaPlanes.fighter} />
    <UnitCountRow type="bomber" label="Bomber (sea battle)" bind:value={form.attacker.seaPlanes.bomber} />

    <h3>Transport group</h3>
    <UnitCountRow type="transport" label="Transports (sea battle)" bind:value={form.attacker.seaTransports} />
    {#if form.attacker.seaTransports > 0}
      <div class="cargo-group">
        <UnitCountRow type="infantry" label="Infantry (embarked)" bind:value={form.attacker.seaCargo.infantry} />
        <UnitCountRow type="artillery" label="Artillery (embarked)" bind:value={form.attacker.seaCargo.artillery} />
        <UnitCountRow type="armor" label="Armor (embarked)" bind:value={form.attacker.seaCargo.armor} />
        <p class="capacity" class:bad={seaOverCapacity}>
          Cargo needs {seaBoatsNeeded} of {form.attacker.seaTransports} transports
          &mdash; 2 infantry OR 1 artillery OR 1 tank per boat.
        </p>
      </div>
    {/if}

    <UnitCountRow type="transport" label="Transports (held back)" bind:value={form.attacker.heldBackTransports} />
    {#if form.attacker.heldBackTransports > 0}
      <div class="cargo-group">
        <UnitCountRow type="infantry" label="Infantry (embarked)" bind:value={form.attacker.heldBackCargo.infantry} />
        <UnitCountRow type="artillery" label="Artillery (embarked)" bind:value={form.attacker.heldBackCargo.artillery} />
        <UnitCountRow type="armor" label="Armor (embarked)" bind:value={form.attacker.heldBackCargo.armor} />
        <p class="capacity" class:bad={heldBackOverCapacity}>
          Cargo needs {heldBackBoatsNeeded} of {form.attacker.heldBackTransports} transports
          &mdash; 2 infantry OR 1 artillery OR 1 tank per boat.
        </p>
        <p class="note">
          Held-back transports never enter the sea battle &mdash; guaranteed to survive and still
          land this cargo if the zone is secured.
        </p>
      </div>
    {/if}

    {#if form.attacker.seaTransports > 0}
      <label class="preserve-toggle" class:active={preserveEnabled}>
        <input type="checkbox" checked={preserveEnabled} onchange={togglePreserve} />
        <span>
          <strong>Preserve transports</strong>
          <small>sacrifice them last in the sea battle &mdash; only lost once every other ship is already sunk</small>
        </span>
      </label>
      {#if preserveEnabled}
        <UnitCountRow
          type="transport"
          label="Transports to preserve"
          max={form.attacker.seaTransports}
          bind:value={form.attacker.preserveTransports}
        />
      {/if}
    {/if}

    <h3>Cover shots (held back)</h3>
    <UnitCountRow type="battleship" label="Battleship" bind:value={form.attacker.coverShips.battleship} />
    <UnitCountRow type="destroyer" label="Destroyer" bind:value={form.attacker.coverShips.destroyer} />

    <h3>Land Force</h3>
    <UnitCountRow type="infantry" label="Infantry (adjacent territory)" bind:value={form.attacker.landTroops.infantry} />
    <UnitCountRow type="artillery" label="Artillery (adjacent territory)" bind:value={form.attacker.landTroops.artillery} />
    <UnitCountRow type="armor" label="Armor (adjacent territory)" bind:value={form.attacker.landTroops.armor} />
    <UnitCountRow type="fighter" label="Fighter (landing)" bind:value={form.attacker.landPlanes.fighter} />
    <UnitCountRow type="bomber" label="Bomber (landing)" bind:value={form.attacker.landPlanes.bomber} />
  </section>

  <section class="column">
    <h2 class="defender">Defender</h2>

    <h3>Sea zone fleet</h3>
    <UnitCountRow type="transport" label="Transport" bind:value={form.defender.seaFleet.transport} />
    <UnitCountRow type="submarine" label="Submarine" bind:value={form.defender.seaFleet.submarine} />
    <UnitCountRow type="destroyer" label="Destroyer" bind:value={form.defender.seaFleet.destroyer} />
    <UnitCountRow type="battleship" label="Battleship" bind:value={form.defender.seaFleet.battleship} />
    <UnitCountRow type="carrier" label="Aircraft Carrier" bind:value={form.defender.seaFleet.carrier} />
    <UnitCountRow type="fighter" label="Fighter (carrier-based)" bind:value={form.defender.seaFighters} />
    {#if form.defender.seaFighters > 0 || form.defender.seaFleet.carrier > 0}
      <p class="capacity" class:bad={overFighterCap}>
        Sea fighters are carrier-based: max {fighterCap}
        ({form.defender.seaFleet.carrier} carrier{form.defender.seaFleet.carrier === 1 ? '' : 's'} &times; 2).
        Bombers cannot defend at sea.
      </p>
    {/if}

    <h3>Territory garrison</h3>
    <UnitCountRow type="infantry" label="Infantry" bind:value={form.defender.landForce.infantry} />
    <UnitCountRow type="artillery" label="Artillery" bind:value={form.defender.landForce.artillery} />
    <UnitCountRow type="armor" label="Armor" bind:value={form.defender.landForce.armor} />
    <UnitCountRow type="aaGun" label="Anti-Aircraft Gun" max={1} bind:value={form.defender.landForce.aaGun} />
    <UnitCountRow type="fighter" label="Fighter" bind:value={form.defender.landPlanes.fighter} />
    <UnitCountRow type="bomber" label="Bomber" bind:value={form.defender.landPlanes.bomber} />
  </section>
</div>

<style>
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

  .capacity {
    margin: 0.35rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .capacity.bad {
    color: var(--danger-text);
  }

  .note {
    margin: 0.35rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .cargo-group {
    margin: 0.3rem 0 0.6rem 0.9rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--gridline);
  }

  .preserve-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    margin-top: 0.6rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-left: 2px solid transparent;
  }

  .preserve-toggle.active {
    border-left-color: var(--brass);
    background: rgba(201, 162, 39, 0.06);
  }

  .preserve-toggle input {
    margin-top: 0.25rem;
    accent-color: var(--brass);
  }

  .preserve-toggle strong {
    display: block;
    font-size: 0.85rem;
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }

  .preserve-toggle small {
    display: block;
    font-size: 0.72rem;
    color: var(--text-secondary);
  }
</style>
