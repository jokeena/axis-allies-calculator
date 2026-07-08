import { emptyArmyComposition } from '../../engine/unitCatalog';
import { ALL_UNIT_TYPES, DEFAULT_TRIALS } from '../../engine';
import type {
  AdvisorRow,
  AmphibiousInput,
  AmphibiousResult,
  ArmyComposition,
  CalculationResult,
  PriorityMode,
} from '../../engine';
import type { WorkerRequest, WorkerResponse } from '../../worker/simulation.worker';

export interface SubmittedForces {
  attacker: ArmyComposition;
  defender: ArmyComposition;
}

/** Reactive form state for the amphibious tab, mirroring AmphibiousInput. */
export interface AmphibiousForm {
  attacker: {
    seaFleet: { submarine: number; destroyer: number; battleship: number; carrier: number };
    seaPlanes: { fighter: number; bomber: number };
    seaTransports: number;
    seaCargo: { infantry: number; artillery: number; armor: number };
    preserveTransports: number;
    heldBackTransports: number;
    heldBackCargo: { infantry: number; artillery: number; armor: number };
    coverShips: { battleship: number; destroyer: number };
    landTroops: { infantry: number; artillery: number; armor: number };
    landPlanes: { fighter: number; bomber: number };
  };
  defender: {
    seaFleet: {
      transport: number;
      submarine: number;
      destroyer: number;
      battleship: number;
      carrier: number;
    };
    seaFighters: number;
    landForce: { infantry: number; artillery: number; armor: number; aaGun: number };
    landPlanes: { fighter: number; bomber: number };
  };
}

function emptyAmphibiousForm(): AmphibiousForm {
  return {
    attacker: {
      seaFleet: { submarine: 0, destroyer: 0, battleship: 0, carrier: 0 },
      seaPlanes: { fighter: 0, bomber: 0 },
      seaTransports: 0,
      seaCargo: { infantry: 0, artillery: 0, armor: 0 },
      preserveTransports: 0,
      heldBackTransports: 0,
      heldBackCargo: { infantry: 0, artillery: 0, armor: 0 },
      coverShips: { battleship: 0, destroyer: 0 },
      landTroops: { infantry: 0, artillery: 0, armor: 0 },
      landPlanes: { fighter: 0, bomber: 0 },
    },
    defender: {
      seaFleet: { transport: 0, submarine: 0, destroyer: 0, battleship: 0, carrier: 0 },
      seaFighters: 0,
      landForce: { infantry: 0, artillery: 0, armor: 0, aaGun: 0 },
      landPlanes: { fighter: 0, bomber: 0 },
    },
  };
}

/** Deep copy of the reactive amphibious form as a plain engine input. */
export function amphibiousInputFromForm(
  form: AmphibiousForm,
  priorityMode: PriorityMode,
  ensureCapture: boolean,
  trialCount: number,
): AmphibiousInput {
  return {
    attacker: {
      seaFleet: { ...form.attacker.seaFleet },
      seaPlanes: { ...form.attacker.seaPlanes },
      seaTransports: form.attacker.seaTransports,
      seaCargo: { ...form.attacker.seaCargo },
      preserveTransports: form.attacker.preserveTransports,
      heldBackTransports: form.attacker.heldBackTransports,
      heldBackCargo: { ...form.attacker.heldBackCargo },
      coverShips: { ...form.attacker.coverShips },
      landTroops: { ...form.attacker.landTroops },
      landPlanes: { ...form.attacker.landPlanes },
    },
    defender: {
      seaFleet: { ...form.defender.seaFleet },
      seaFighters: form.defender.seaFighters,
      landForce: { ...form.defender.landForce },
      landPlanes: { ...form.defender.landPlanes },
    },
    priorityMode,
    ensureCapture,
    trialCount,
  };
}

export type CalculatorTab = 'standard' | 'amphibious';

export interface BattleStore {
  tab: CalculatorTab;
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
  advising: boolean;
  advice: AdvisorRow[] | null;
  amphibious: AmphibiousForm;
  amphibiousCalculating: boolean;
  amphibiousResult: AmphibiousResult | null;
  amphibiousResultEnsureCapture: boolean;
  amphibiousError: string | null;
  runCalculation: () => void;
  runAdvice: () => void;
  runAmphibious: () => void;
  swapSides: () => void;
  reset: () => void;
  resetAmphibious: () => void;
}

/**
 * Holds the reactive input/result state for the whole app. All simulations
 * run in a Web Worker so a 100k-trial calculation doesn't freeze the UI.
 */
export function createBattleStore(): BattleStore {
  let tab = $state<CalculatorTab>('standard');
  const attacker = $state<ArmyComposition>(emptyArmyComposition());
  const defender = $state<ArmyComposition>(emptyArmyComposition());
  let priorityMode = $state<PriorityMode>('militaristic');
  let ensureCapture = $state(false);
  let calculating = $state(false);
  let result = $state<CalculationResult | null>(null);
  let forces = $state<SubmittedForces | null>(null);
  let resultEnsureCapture = $state(false);
  let error = $state<string | null>(null);
  let advising = $state(false);
  let advice = $state<AdvisorRow[] | null>(null);

  const amphibious = $state<AmphibiousForm>(emptyAmphibiousForm());
  let amphibiousCalculating = $state(false);
  let amphibiousResult = $state<AmphibiousResult | null>(null);
  let amphibiousResultEnsureCapture = $state(false);
  let amphibiousError = $state<string | null>(null);

  let worker: Worker | null = null;

  function getWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL('../../worker/simulation.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.kind === 'result') {
          calculating = false;
          result = response.result;
        } else if (response.kind === 'advice') {
          advising = false;
          advice = response.rows;
        } else if (response.kind === 'amphibiousResult') {
          amphibiousCalculating = false;
          amphibiousResult = response.result;
        } else {
          calculating = false;
          advising = false;
          amphibiousCalculating = false;
          if (tab === 'amphibious') amphibiousError = response.message;
          else error = response.message;
        }
      };
    }
    return worker;
  }

  function post(request: WorkerRequest): void {
    getWorker().postMessage(request);
  }

  function runCalculation(): void {
    calculating = true;
    error = null;
    result = null;
    advice = null;
    forces = { attacker: { ...attacker }, defender: { ...defender } };
    resultEnsureCapture = ensureCapture;
    post({
      kind: 'calculate',
      input: {
        attacker: { ...attacker },
        defender: { ...defender },
        priorityMode,
        trialCount: DEFAULT_TRIALS,
        ensureCapture,
      },
    });
  }

  function runAdvice(): void {
    if (!forces) return;
    advising = true;
    advice = null;
    post({
      kind: 'advise',
      input: {
        attacker: { ...forces.attacker },
        defender: { ...forces.defender },
        priorityMode,
        trialCount: DEFAULT_TRIALS,
        ensureCapture: resultEnsureCapture,
      },
    });
  }

  function runAmphibious(): void {
    amphibiousCalculating = true;
    amphibiousError = null;
    amphibiousResult = null;
    amphibiousResultEnsureCapture = ensureCapture;
    post({
      kind: 'amphibious',
      input: amphibiousInputFromForm(amphibious, priorityMode, ensureCapture, DEFAULT_TRIALS),
    });
  }

  function swapSides(): void {
    for (const type of ALL_UNIT_TYPES) {
      // The AA gun is territory equipment — it stays with the defender.
      if (type === 'aaGun') continue;
      const held = attacker[type];
      attacker[type] = defender[type];
      defender[type] = held;
    }
    advice = null;
  }

  function reset(): void {
    for (const type of ALL_UNIT_TYPES) {
      attacker[type] = 0;
      defender[type] = 0;
    }
    result = null;
    forces = null;
    error = null;
    advice = null;
  }

  function resetAmphibious(): void {
    Object.assign(amphibious, emptyAmphibiousForm());
    amphibiousResult = null;
    amphibiousError = null;
  }

  return {
    get tab() {
      return tab;
    },
    set tab(value: CalculatorTab) {
      tab = value;
    },
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
    get advising() {
      return advising;
    },
    get advice() {
      return advice;
    },
    get amphibious() {
      return amphibious;
    },
    get amphibiousCalculating() {
      return amphibiousCalculating;
    },
    get amphibiousResult() {
      return amphibiousResult;
    },
    get amphibiousResultEnsureCapture() {
      return amphibiousResultEnsureCapture;
    },
    get amphibiousError() {
      return amphibiousError;
    },
    runCalculation,
    runAdvice,
    runAmphibious,
    swapSides,
    reset,
    resetAmphibious,
  };
}
