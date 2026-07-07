<script lang="ts">
  import { formatCount } from '../format';

  let { attacker, defender }: { attacker: number; defender: number } = $props();
</script>

<div class="ipc-summary">
  <span class="entry"><span class="dot attacker"></span>Attacker IPC lost: <strong>{formatCount(attacker)}</strong></span>
  <span class="entry"><span class="dot defender"></span>Defender IPC lost: <strong>{formatCount(defender)}</strong></span>
</div>

<style>
  .ipc-summary {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    margin-top: 0.75rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.35rem;
  }

  .dot.attacker {
    background: var(--attacker);
  }
  .dot.defender {
    background: var(--defender);
  }

  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
</style>
