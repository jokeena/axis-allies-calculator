<script lang="ts">
  import ArmyInputForm from './ui/components/ArmyInputForm.svelte';
  import AmphibiousFormView from './ui/components/AmphibiousFormView.svelte';
  import AmphibiousReport from './ui/components/AmphibiousReport.svelte';
  import AdvisorPanel from './ui/components/AdvisorPanel.svelte';
  import PriorityModeSelector from './ui/components/PriorityModeSelector.svelte';
  import ResultsSummary from './ui/components/ResultsSummary.svelte';
  import IpcLossSummary from './ui/components/IpcLossSummary.svelte';
  import ForceReport from './ui/components/ForceReport.svelte';
  import { amphibiousInputFromForm, createBattleStore } from './ui/stores/battleStore.svelte';
  import { DEFAULT_TRIALS, amphibiousValidationErrors } from './engine';

  const store = createBattleStore();
  const trialsLabel = DEFAULT_TRIALS.toLocaleString('en-US');

  const amphibiousErrors = $derived(
    amphibiousValidationErrors(
      amphibiousInputFromForm(store.amphibious, store.priorityMode, store.ensureCapture, 1),
    ),
  );

  function calculateAmphibious(): void {
    if (amphibiousErrors.length === 0 && !store.amphibiousCalculating) {
      store.runAmphibious();
    }
  }

  /** Enter submits the active tab's Calculate action from anywhere on the
   * page — not just while focused inside a text input. Buttons and links
   * are left alone so their own native Enter-triggers-click behavior isn't
   * double-fired. */
  function handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
    event.preventDefault();
    if (store.tab === 'standard') {
      if (!store.calculating) store.runCalculation();
    } else {
      calculateAmphibious();
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<main>
  <header>
    <h1>Axis &amp; Allies<span class="sub-word">Combat Calculator</span></h1>
    <p class="tagline">Monte Carlo battle projections &middot; Europe edition rules</p>
  </header>

  <nav class="tabs">
    <button class:active={store.tab === 'standard'} onclick={() => (store.tab = 'standard')}>
      Standard battle
    </button>
    <button class:active={store.tab === 'amphibious'} onclick={() => (store.tab = 'amphibious')}>
      Amphibious assault
    </button>
  </nav>

  {#if store.tab === 'standard'}
    <section class="panel">
      <p class="panel-title">01 &middot; Order of battle</p>
      <ArmyInputForm attacker={store.attacker} defender={store.defender} />

      <div class="controls">
        <div class="doctrine">
          <PriorityModeSelector bind:mode={store.priorityMode} />
          <label class="ensure-capture" class:active={store.ensureCapture}>
            <input type="checkbox" bind:checked={store.ensureCapture} />
            <span>
              <strong>Ensure capture</strong>
              <small>
                sacrifice aircraft before your last land unit &mdash; only battles won with a land
                unit standing count as captures
              </small>
            </span>
          </label>
        </div>
        <div class="launch">
          <button class="calculate" onclick={store.runCalculation} disabled={store.calculating}>
            {store.calculating ? 'Simulating…' : 'Calculate'}
          </button>
          <div class="secondary-buttons">
            <button class="secondary" onclick={store.swapSides} disabled={store.calculating}>
              Swap sides
            </button>
            <button class="secondary" onclick={store.reset} disabled={store.calculating}>
              Reset
            </button>
          </div>
          <p class="note">Odds from {trialsLabel} simulated battles.</p>
        </div>
      </div>

      {#if store.error}
        <p class="error">{store.error}</p>
      {/if}
    </section>

    {#if store.result && store.forces}
      <section class="panel">
        <p class="panel-title">02 &middot; Projection</p>
        <ResultsSummary
          attackerWinPct={store.result.simulation.attackerWinPct}
          defenderWinPct={store.result.simulation.defenderWinPct}
          tiePct={store.result.simulation.tiePct}
          standoffPct={store.result.simulation.standoffPct}
          clearedNotCapturedPct={store.result.simulation.clearedNotCapturedPct}
          ensureCapture={store.resultEnsureCapture}
        />
        <IpcLossSummary
          attacker={store.result.simulation.totalIpcLoss.attacker}
          defender={store.result.simulation.totalIpcLoss.defender}
        />
        <AdvisorPanel
          advice={store.advice}
          advising={store.advising}
          baselineAttackerPct={store.result.simulation.attackerWinPct}
          baselineDefenderPct={store.result.simulation.defenderWinPct}
          ensureCapture={store.resultEnsureCapture}
          onAdvise={store.runAdvice}
        />
      </section>

      <section class="panel">
        <p class="panel-title">03 &middot; Force report</p>
        <ForceReport expected={store.result.expected} forces={store.forces} />
      </section>
    {/if}
  {:else}
    <section class="panel">
      <p class="panel-title">01 &middot; Assault plan</p>
      <AmphibiousFormView form={store.amphibious} />

      <div class="controls">
        <div class="doctrine">
          <PriorityModeSelector bind:mode={store.priorityMode} />
          <label class="ensure-capture" class:active={store.ensureCapture}>
            <input type="checkbox" bind:checked={store.ensureCapture} />
            <span>
              <strong>Ensure capture</strong>
              <small>
                sacrifice aircraft before your last land unit &mdash; only battles won with a land
                unit standing count as captures
              </small>
            </span>
          </label>
        </div>
        <div class="launch">
          <button
            class="calculate"
            onclick={calculateAmphibious}
            disabled={store.amphibiousCalculating || amphibiousErrors.length > 0}
          >
            {store.amphibiousCalculating ? 'Simulating…' : 'Calculate'}
          </button>
          <div class="secondary-buttons">
            <button class="secondary" onclick={store.resetAmphibious} disabled={store.amphibiousCalculating}>
              Reset
            </button>
          </div>
          <p class="note">Odds from {trialsLabel} simulated battles.</p>
        </div>
      </div>

      {#each amphibiousErrors as validationError (validationError)}
        <p class="error">{validationError}</p>
      {/each}
      {#if store.amphibiousError}
        <p class="error">{store.amphibiousError}</p>
      {/if}
    </section>

    {#if store.amphibiousResult}
      <section class="panel">
        <p class="panel-title">02 &middot; Projection</p>
        <ResultsSummary
          attackerWinPct={store.amphibiousResult.simulation.attackerWinPct}
          defenderWinPct={store.amphibiousResult.simulation.defenderWinPct}
          tiePct={store.amphibiousResult.simulation.tiePct}
          standoffPct={store.amphibiousResult.simulation.standoffPct}
          clearedNotCapturedPct={store.amphibiousResult.simulation.clearedNotCapturedPct}
          ensureCapture={store.amphibiousResultEnsureCapture}
          seaControlledPct={store.amphibiousResult.simulation.seaControlledPct}
        />
        <IpcLossSummary
          attacker={store.amphibiousResult.simulation.totalIpcLoss.attacker}
          defender={store.amphibiousResult.simulation.totalIpcLoss.defender}
        />
      </section>

      <section class="panel">
        <p class="panel-title">03 &middot; Force report</p>
        <AmphibiousReport expected={store.amphibiousResult.expected} />
      </section>
    {/if}
  {/if}

  <footer>
    <p>Combat rules per the official Axis &amp; Allies Europe rulebook. Battles run to the death &mdash; no retreats.</p>
  </footer>
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    margin-bottom: 0.5rem;
  }

  h1 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(1.6rem, 4.5vw, 2.6rem);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
    line-height: 1.1;
    color: var(--text-primary);
  }

  .sub-word {
    display: block;
    color: var(--brass);
    font-size: 0.62em;
    letter-spacing: 0.14em;
  }

  .tagline {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
    margin: 0.6rem 0 0;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
  }

  .tabs button {
    padding: 0.55rem 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-bottom: 2px solid var(--gridline);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .tabs button.active {
    background: var(--surface-1);
    color: var(--brass);
    border-bottom-color: var(--brass);
  }

  .controls {
    display: grid;
    grid-template-columns: minmax(280px, 1.4fr) minmax(200px, 1fr);
    align-items: center;
    gap: 1.5rem;
    margin-top: 1.75rem;
  }

  @media (max-width: 640px) {
    .controls {
      grid-template-columns: 1fr;
    }
  }

  .doctrine {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ensure-capture {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    background: var(--surface-2);
    border: 1px solid var(--gridline);
    border-left: 2px solid transparent;
  }

  .ensure-capture.active {
    border-left-color: var(--brass);
    background: rgba(201, 162, 39, 0.06);
  }

  .ensure-capture input {
    margin-top: 0.25rem;
    accent-color: var(--brass);
  }

  .ensure-capture strong {
    display: block;
    font-size: 0.9rem;
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }

  .ensure-capture small {
    display: block;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .launch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .calculate {
    width: 100%;
    padding: 0.85rem 1.5rem;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border: 1px solid var(--brass-bright);
    border-radius: 3px;
    background: var(--brass);
    color: #171507;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .calculate:hover:not(:disabled) {
    background: var(--brass-bright);
  }

  .calculate:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .secondary-buttons {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .secondary {
    flex: 1;
    padding: 0.5rem 1rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    border: 1px solid var(--gridline);
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .secondary:hover:not(:disabled) {
    border-color: var(--text-muted);
    color: var(--text-primary);
  }

  .secondary:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 0;
  }

  .error {
    color: var(--danger-text);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    margin: 1rem 0 0;
  }

  footer p {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    text-align: center;
    margin: 0;
  }
</style>
