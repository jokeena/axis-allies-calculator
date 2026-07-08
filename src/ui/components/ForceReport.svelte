<script lang="ts">
  import ArmyReport from './ArmyReport.svelte';
  import RemainingByRound from './RemainingByRound.svelte';
  import { UNIT_DISPLAY_ORDER, unitLabel } from '../unitLabels';
  import { formatCount } from '../format';
  import { detectBattleContext } from '../../engine';
  import type { ExpectedBattleResult, ExpectedRound, UnitLossCounts, UnitType } from '../../engine';
  import type { SubmittedForces } from '../stores/battleStore.svelte';

  let { expected, forces }: { expected: ExpectedBattleResult; forces: SubmittedForces } = $props();

  const context = $derived(detectBattleContext(forces.attacker, forces.defender));

  const attackerTypes = $derived(
    UNIT_DISPLAY_ORDER.filter((t) => (expected.attackerStart[t] ?? 0) > 0),
  );
  const defenderTypes = $derived(
    UNIT_DISPLAY_ORDER.filter((t) => (expected.defenderStart[t] ?? 0) > 0),
  );

  function specialNote(source: UnitLossCounts, prefix: string): string | null {
    const parts = (Object.entries(source) as [UnitType, number][])
      .filter(([, count]) => count >= 0.005)
      .map(([type, count]) => `${formatCount(count, 2)} ${unitLabel(type, count, 2)}`);
    return parts.length > 0 ? `${prefix} ${parts.join(', ')}` : null;
  }

  const attackerNote = $derived(specialNote(expected.aaLosses, 'AA fire claims'));
  const defenderNote = $derived(specialNote(expected.bombardmentLosses, 'Cover shots claim'));

  /** Remaining counts after a pre-battle strike: start minus its losses. */
  function afterStrike(start: UnitLossCounts, losses: UnitLossCounts): UnitLossCounts {
    const out: UnitLossCounts = {};
    for (const [type, count] of Object.entries(start) as [UnitType, number][]) {
      out[type] = Math.max(0, count - (losses[type] ?? 0));
    }
    return out;
  }

  const attackerPreBattle = $derived.by(() => {
    if (Object.keys(expected.aaLosses).length === 0) return undefined;
    return { label: 'AA fire', counts: afterStrike(expected.attackerStart, expected.aaLosses) };
  });

  const defenderPreBattle = $derived.by(() => {
    if (Object.keys(expected.bombardmentLosses).length === 0) return undefined;
    return {
      label: 'Cover shots',
      counts: afterStrike(expected.defenderStart, expected.bombardmentLosses),
    };
  });

  /** A round's displayed appearance across BOTH tables. */
  function roundSignature(round: ExpectedRound): string {
    const att = attackerTypes.map((t) => formatCount(round.attacker[t] ?? 0)).join(',');
    const def = defenderTypes.map((t) => formatCount(round.defender[t] ?? 0)).join(',');
    return `${att}|${def}`;
  }

  /** Trim trailing rounds that look identical (at displayed rounding) to the
   * round above them — they add rows without adding information. */
  const visibleRounds = $derived.by(() => {
    const rounds = [...expected.rounds];
    while (rounds.length >= 2) {
      const last = roundSignature(rounds[rounds.length - 1]);
      const previous = roundSignature(rounds[rounds.length - 2]);
      if (last !== previous) break;
      rounds.pop();
    }
    return rounds;
  });

  const trimmedCount = $derived(expected.rounds.length - visibleRounds.length);
</script>

<div class="force-report">
  {#if context.note}
    <p class="context-note">{context.note}</p>
  {/if}

  <p class="model-note">
    Expected-value attrition &mdash; each unit deals its average damage per round, and casualties
    fall in your doctrine's sacrifice order. Win odds and IPC come from the full simulation.
  </p>

  <div class="reports">
    <ArmyReport
      side="attacker"
      start={expected.attackerStart}
      survivors={expected.attackerSurvivors}
      specialNote={attackerNote}
    />
    <ArmyReport
      side="defender"
      start={expected.defenderStart}
      survivors={expected.defenderSurvivors}
      specialNote={defenderNote}
    />
  </div>

  {#if visibleRounds.length > 0 || attackerPreBattle || defenderPreBattle}
    <div class="by-round">
      <h3>Expected force remaining, round by round</h3>
      <div class="tables">
        <RemainingByRound
          side="attacker"
          types={attackerTypes}
          start={expected.attackerStart}
          rounds={visibleRounds}
          preBattle={attackerPreBattle}
        />
        <RemainingByRound
          side="defender"
          types={defenderTypes}
          start={expected.defenderStart}
          rounds={visibleRounds}
          preBattle={defenderPreBattle}
        />
      </div>
      {#if trimmedCount > 0}
        <p class="trim-note">Later rounds omitted &mdash; no further change at this precision.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .force-report {
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
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-left: 3px solid var(--brass);
    max-width: 72ch;
  }

  .model-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    line-height: 1.6;
    color: var(--text-muted);
    margin: 0;
    max-width: 72ch;
  }

  .reports {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem 2.5rem;
  }

  .by-round {
    margin-top: 0.5rem;
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
