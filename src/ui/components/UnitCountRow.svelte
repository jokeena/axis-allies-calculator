<script lang="ts">
  import UnitIcon from './UnitIcon.svelte';
  import type { UnitType } from '../../engine';

  let {
    type,
    label,
    value = $bindable(),
    max,
  }: { type: UnitType; label: string; value: number; max?: number } = $props();

  function handleInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const parsed = Number.parseInt(el.value, 10);
    let next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (max !== undefined && next > max) next = max;
    value = next;
    // Reflect clamping back into the field (e.g. typing "5" in a max-1 input),
    // but leave a field the user is mid-clearing alone until they type again.
    if (el.value !== '' && el.value !== String(next)) {
      el.value = String(next);
    }
  }
</script>

<label class="row">
  <span class="icon"><UnitIcon {type} /></span>
  <span class="label">{label}</span>
  <input type="number" min="0" {max} step="1" value={value} oninput={handleInput} />
</label>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.28rem 0;
  }

  .icon {
    display: inline-flex;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .row:hover .icon,
  .row:focus-within .icon {
    color: var(--brass);
  }

  .label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    flex: 1;
  }

  .row:focus-within .label {
    color: var(--text-primary);
  }

  input {
    width: 4.5rem;
    text-align: left;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--gridline);
    border-radius: 3px;
    background: var(--surface-2);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }

  input:focus {
    outline: none;
    border-color: var(--brass);
    box-shadow: 0 0 0 1px var(--brass);
  }
</style>
