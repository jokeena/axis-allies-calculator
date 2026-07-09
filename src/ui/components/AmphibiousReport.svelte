<script lang="ts">
  import ArmyReport from './ArmyReport.svelte';
  import RemainingByRound from './RemainingByRound.svelte';
  import { UNIT_DISPLAY_ORDER, unitLabel } from '../unitLabels';
  import { formatCount } from '../format';
  import type { AmphibiousExpected, AmphibiousStage, ExpectedRound, UnitLossCounts, UnitType } from '../../engine';

  let { expected }: { expected: AmphibiousExpected } = $props();

  function typesIn(stage: AmphibiousStage, side: 'attacker' | 'defender'): UnitType[] {
    const start = side === 'attacker' ? stage.attackerStart : stage.defenderStart;
    return UNIT_DISPLAY_ORDER.filter((t) => (start[t] ?? 0) > 0);
  }

  function lossNote(source: UnitLossCounts, prefix: string): string | null {
    const parts = (Object.entries(source) as [UnitType, number][])
      .filter(([, count]) => count >= 0.005)
      .map(([type, count]) => `${formatCount(count, 2)} ${unitLabel(type, count, 2)}`);
    return parts.length > 0 ? `${prefix} ${parts.join(', ')}` : null;
  }

  const cargoNote = $derived(lossNote(expected.cargoLost, 'Cargo lost with sunk transports:'));
  const aaNote = $derived(lossNote(expected.aaLosses, 'AA fire claims'));
  const bombardmentNote = $derived(lossNote(expected.bombardmentLosses, 'Cover shots claim'));

  /** Trim trailing rounds identical at displayed rounding, across both sides. */
  function visibleRounds(stage: AmphibiousStage): ExpectedRound[] {
    const attackerTypes = typesIn(stage, 'attacker');
    const defenderTypes = typesIn(stage, 'defender');
    const signature = (round: ExpectedRound): string => {
      const att = attackerTypes.map((t) => formatCount(round.attacker[t] ?? 0)).join(',');
      const def = defenderTypes.map((t) => formatCount(round.defender[t] ?? 0)).join(',');
      return `${att}|${def}`;
    };
    const rounds = [...stage.rounds];
    while (rounds.length >= 2) {
      if (signature(rounds[rounds.length - 1]) !== signature(rounds[rounds.length - 2])) break;
      rounds.pop();
    }
    return rounds;
  }

  const seaRounds = $derived(expected.sea ? visibleRounds(expected.sea) : []);
  const landRounds = $derived(visibleRounds(expected.land));

  const landAttackerPre = $derived.by(() => {
    if (Object.keys(expected.aaLosses).length === 0) return undefined;
    const counts: UnitLossCounts = {};
    for (const [type, count] of Object.entries(expected.land.attackerStart) as [UnitType, number][]) {
      counts[type] = Math.max(0, count - (expected.aaLosses[type] ?? 0));
    }
    return { label: 'AA fire', counts };
  });

  const landDefenderPre = $derived.by(() => {
    if (Object.keys(expected.bombardmentLosses).length === 0) return undefined;
    const counts: UnitLossCounts = {};
    for (const [type, count] of Object.entries(expected.land.defenderStart) as [UnitType, number][]) {
      counts[type] = Math.max(0, count - (expected.bombardmentLosses[type] ?? 0));
    }
    return { label: 'Cover shots', counts };
  });
</script>

<div class="amphibious-report">
  <p class="model-note">
    Expected-value attrition &mdash; each unit deals its average damage per round, and casualties
    fall in your doctrine's sacrifice order. Win odds and IPC come from the full simulation.
  </p>

  {#if expected.sea}
    <h3 class="stage-title">Stage 1 &middot; Sea battle</h3>
    <p class="stage-note">
      {expected.seaControlled
        ? 'The expected battle clears the sea zone — transports unload and cover shots fire.'
        : 'The expected battle does NOT clear the sea zone — nothing lands, every ship goes inert, and only the adjacent-territory force fights the landing.'}
    </p>
    <div class="reports">
      <ArmyReport
        side="attacker"
        start={expected.sea.attackerStart}
        survivors={expected.sea.attackerSurvivors}
        specialNote={cargoNote}
      />
      <ArmyReport
        side="defender"
        start={expected.sea.defenderStart}
        survivors={expected.sea.defenderSurvivors}
        specialNote={null}
      />
    </div>
    {#if seaRounds.length > 0}
      <div class="tables">
        <RemainingByRound
          side="attacker"
          types={typesIn(expected.sea, 'attacker')}
          start={expected.sea.attackerStart}
          rounds={seaRounds}
        />
        <RemainingByRound
          side="defender"
          types={typesIn(expected.sea, 'defender')}
          start={expected.sea.defenderStart}
          rounds={seaRounds}
        />
      </div>
    {/if}
  {/if}

  <h3 class="stage-title">{expected.sea ? 'Stage 2 · Landing' : 'Landing'}</h3>
  <div class="reports">
    <ArmyReport
      side="attacker"
      start={expected.land.attackerStart}
      survivors={expected.land.attackerSurvivors}
      specialNote={aaNote}
    />
    <ArmyReport
      side="defender"
      start={expected.land.defenderStart}
      survivors={expected.land.defenderSurvivors}
      specialNote={bombardmentNote}
    />
  </div>
  {#if landRounds.length > 0 || landAttackerPre || landDefenderPre}
    <div class="tables">
      <RemainingByRound
        side="attacker"
        types={typesIn(expected.land, 'attacker')}
        start={expected.land.attackerStart}
        rounds={landRounds}
        preBattle={landAttackerPre}
      />
      <RemainingByRound
        side="defender"
        types={typesIn(expected.land, 'defender')}
        start={expected.land.defenderStart}
        rounds={landRounds}
        preBattle={landDefenderPre}
      />
    </div>
  {/if}
</div>

<style>
  .amphibious-report {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  .stage-title {
    margin: 0.75rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--brass);
  }

  .stage-note {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.05em;
    line-height: 1.6;
    color: var(--text-secondary);
    max-width: 72ch;
  }

  .reports {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem 2.5rem;
  }

  .tables {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem 2.5rem;
  }
</style>
