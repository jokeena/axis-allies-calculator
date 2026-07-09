<script lang="ts">
  import type { PriorityMode } from '../../engine';

  let { mode = $bindable() }: { mode: PriorityMode } = $props();
</script>

<fieldset>
  <legend>Casualty doctrine</legend>
  <label class:active={mode === 'militaristic'}>
    <input type="radio" name="priorityMode" value="militaristic" checked={mode === 'militaristic'} onchange={() => (mode = 'militaristic')} />
    <span>
      <strong>Militaristic</strong>
      <small>keep your hardest-hitting units alive longest</small>
    </span>
  </label>
  <label class:active={mode === 'economical'}>
    <input type="radio" name="priorityMode" value="economical" checked={mode === 'economical'} onchange={() => (mode = 'economical')} />
    <span>
      <strong>Economical</strong>
      <small>sacrifice your cheapest units first</small>
    </span>
  </label>
</fieldset>

<style>
  fieldset {
    border: 1px solid var(--gridline);
    padding: 0.6rem 1rem 0.75rem;
    margin: 0;
    background: var(--surface-2);
  }

  legend {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--brass);
    padding: 0 0.5rem;
  }

  label {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.4rem 0.5rem;
    cursor: pointer;
    border-left: 2px solid transparent;
  }

  label.active {
    border-left-color: var(--brass);
    background: rgba(201, 162, 39, 0.06);
  }

  input {
    margin-top: 0.25rem;
    accent-color: var(--brass);
  }

  strong {
    display: block;
    font-size: 0.9rem;
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }

  small {
    display: block;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }
</style>
