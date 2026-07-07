import { emptyArmyComposition } from '../../engine/unitCatalog';
import type { CalculationResult, ArmyComposition, PriorityMode } from '../../engine';
import { DEFAULT_TRIALS } from '../../engine';

export interface SubmittedForces {
  attacker: ArmyComposition;
  defender: ArmyComposition;
}

export interface BattleStore {
  attacker: ArmyComposition;
  defender: ArmyComposition;
  priorityMode: PriorityMode;
  ensureCapture: boolean;
  calculating: boolean;
  result: CalculationResult | null;
  /** Snapshot of the forces the current result was computed from. */
  forces: SubmittedForces | null;
  /** Whether the current result was computed with Ensure Capture on. */
  resultEnsureCapture: boolean;
  error: string | null;
  runCalculation: () => void;
  reset: () => void;
}

/**
 * Holds the reactive input/result state for the whole app. Runs the
 * simulation in a Web Worker so a 100k-trial calculation doesn't freeze the
 * UI thread.
 */
export function createBattleStore(): BattleStore {
  const attacker = $state<ArmyComposition>(emptyArmyComposition());
  const defender = $state<ArmyComposition>(emptyArmyComposition());
  let priorityMode = $state<PriorityMode>('militaristic');
  let ensureCapture = $state(false);
  let calculating = $state(false);
  let result = $state<CalculationResult | null>(null);
  let forces = $state<SubmittedForces | null>(null);
  let resultEnsureCapture = $state(false);
  let error = $state<string | null>(null);

  let worker: Worker | null = null;

  function getWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL('../../worker/simulation.worker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return worker;
  }

  function runCalculation(): void {
    calculating = true;
    error = null;
    result = null;
    forces = { attacker: { ...attacker }, defender: { ...defender } };
    resultEnsureCapture = ensureCapture;

    const w = getWorker();
    const handleMessage = (event: MessageEvent<CalculationResult | { error: string }>): void => {
      calculating = false;
      if ('error' in event.data) {
        error = event.data.error;
      } else {
        result = event.data;
      }
      w.removeEventListener('message', handleMessage);
    };
    w.addEventListener('message', handleMessage);

    w.postMessage({
      attacker: { ...attacker },
      defender: { ...defender },
      priorityMode,
      trialCount: DEFAULT_TRIALS,
      ensureCapture,
    });
  }

  function reset(): void {
    for (const key of Object.keys(attacker) as Array<keyof ArmyComposition>) {
      attacker[key] = 0;
    }
    for (const key of Object.keys(defender) as Array<keyof ArmyComposition>) {
      defender[key] = 0;
    }
    result = null;
    forces = null;
    error = null;
  }

  return {
    get attacker() {
      return attacker;
    },
    get defender() {
      return defender;
    },
    get priorityMode() {
      return priorityMode;
    },
    set priorityMode(value: PriorityMode) {
      priorityMode = value;
    },
    get ensureCapture() {
      return ensureCapture;
    },
    set ensureCapture(value: boolean) {
      ensureCapture = value;
    },
    get calculating() {
      return calculating;
    },
    get result() {
      return result;
    },
    get forces() {
      return forces;
    },
    get resultEnsureCapture() {
      return resultEnsureCapture;
    },
    get error() {
      return error;
    },
    runCalculation,
    reset,
  };
}
