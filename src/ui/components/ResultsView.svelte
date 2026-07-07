<script lang="ts">
  import ResultsSummary from './ResultsSummary.svelte';
  import ArmyReport from './ArmyReport.svelte';
  import RemainingByRound from './RemainingByRound.svelte';
  import IpcLossSummary from './IpcLossSummary.svelte';
  import { detectBattleContext } from '../../engine';
  import type { AggregatedResult, Phase, RoundLossRow, UnitLossCounts } from '../../engine';
  import type { SubmittedForces } from '../stores/battleStore.svelte';

  let {
    result,
    forces,
    ensureCapture,
  }: { result: AggregatedResult; forces: SubmittedForces; ensureCapture: boolean } = $props();

  const context = $derived(detectBattleContext(forces.attacker, forces.defender));

  const phasesPresent = $derived(
    (['naval', 'land'] as Phase[]).filter((phase) => result.roundByRoundLosses[phase].length > 0),
  );

  function totalLosses(counts: UnitLossCounts): number {
    return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  }

  /**
   * Trims the table tail: drops the longest run of final rounds whose
   * combined expected losses (both sides) stay below 0.05 — below the
   * displayed precision, so nothing visible is lost.
   */
  function meaningfulCutoff(rows: RoundLossRow[]): { maxRound: number; trimmedFrom: number | null } {
    let cumulative = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      cumulative += totalLosses(rows[i].attackerLosses) + totalLosses(rows[i].defenderLosses);
      if (cumulative >= 0.05) {
        const maxRound = rows[i].round;
        const lastRound = rows[rows.length - 1].round;
        return { maxRound, trimmedFrom: maxRound < lastRound ? maxRound + 1 : null };
      }
    }
    return { maxRound: rows.length > 0 ? rows[rows.length - 1].round : 0, trimmedFrom: null };
  }

  const cutoffs = $derived.by(() => {
    const map = {} as Record<Phase, { maxRound: number; trimmedFrom: number | null }>;
    for (const phase of phasesPresent) {
      map[phase] = meaningfulCutoff(result.roundByRoundLosses[phase]);
    }
    return map;
  });
</script>

<section class="results">
  <ResultsSummary
    attackerWinPct={result.attackerWinPct}
    defenderWinPct={result.defenderWinPct}
    tiePct={result.tiePct}
    standoffPct={result.standoffPct}
    clearedNotCapturedPct={result.clearedNotCapturedPct}
    {ensureCapture}
  />
  <IpcLossSummary attacker={result.totalIpcLoss.attacker} defender={result.totalIpcLoss.defender} />

  {#if context.note}
    <p class="context-note">{context.note}</p>
  {/if}

  <p class="losses-note">
    Averages across {result.trialsRun.toLocaleString('en-US')} simulated battles. Casualties are
    listed in the order units typically fall.
  </p>

  <div class="reports">
    <ArmyReport side="attacker" composition={forces.attacker} {result} {context} />
    <ArmyReport side="defender" composition={forces.defender} {result} {context} />
  </div>

  {#if phasesPresent.length > 0}
    <div class="by-round">
      <h3>Expected force remaining, round by round</h3>
      {#each phasesPresent as phase (phase)}
        <div class="tables">
          <RemainingByRound
            side="attacker"
            {phase}
            composition={forces.attacker}
            {result}
            {context}
            maxRound={cutoffs[phase].maxRound}
          />
          <RemainingByRound
            side="defender"
            {phase}
            composition={forces.defender}
            {result}
            {context}
            maxRound={cutoffs[phase].maxRound}
          />
        </div>
        {#if cutoffs[phase].trimmedFrom !== null}
          <p class="trim-note">
            Rounds {cutoffs[phase].trimmedFrom}+ omitted &mdash; battles rarely last that long, and
            the expected change is negligible.
          </p>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .context-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0.75rem 0 0;
    padding: 0.5rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-left: 3px solid var(--brass);
    max-width: 72ch;
  }

  .losses-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 0.5rem 0 0;
  }

  .reports {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem 2.5rem;
  }

  .by-round {
    margin-top: 1rem;
  }

  .by-round h3 {
    margin: 0 0 0.8rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--brass);
  }

  .tables {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem 2.5rem;
  }

  .trim-note {
    margin: 0.5rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
</style>
