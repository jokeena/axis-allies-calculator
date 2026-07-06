<script lang="ts">
  import ResultsSummary from './ResultsSummary.svelte';
  import ExpectedLossList from './ExpectedLossList.svelte';
  import IpcLossSummary from './IpcLossSummary.svelte';
  import { detectBattleContext } from '../../engine';
  import type { AggregatedResult } from '../../engine';
  import type { SubmittedForces } from '../stores/battleStore.svelte';

  let { result, forces }: { result: AggregatedResult; forces: SubmittedForces } = $props();

  const context = $derived(detectBattleContext(forces.attacker, forces.defender));
</script>

<section class="results">
  <ResultsSummary
    attackerWinPct={result.attackerWinPct}
    defenderWinPct={result.defenderWinPct}
    tiePct={result.tiePct}
  />
  <IpcLossSummary attacker={result.totalIpcLoss.attacker} defender={result.totalIpcLoss.defender} />

  <p class="losses-note">
    Average units lost across {result.trialsRun.toLocaleString('en-US')} simulated battles &mdash;
    listed in the order they typically fall.
  </p>

  <div class="losses">
    <ExpectedLossList side="attacker" composition={forces.attacker} {result} {context} />
    <ExpectedLossList side="defender" composition={forces.defender} {result} {context} />
  </div>
</section>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .losses-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 0.75rem 0 0;
  }

  .losses {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem 2.5rem;
  }
</style>
