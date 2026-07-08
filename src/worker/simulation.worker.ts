import { runAdvisor, runAmphibiousCalculation, runCalculation, UNIT_CATALOG } from '../engine';
import type {
  AdvisorRow,
  AmphibiousInput,
  AmphibiousResult,
  BattleInput,
  CalculationResult,
} from '../engine';

export type WorkerRequest =
  | { kind: 'calculate'; input: BattleInput }
  | { kind: 'advise'; input: BattleInput }
  | { kind: 'amphibious'; input: AmphibiousInput };

export type WorkerResponse =
  | { kind: 'result'; result: CalculationResult }
  | { kind: 'advice'; rows: AdvisorRow[] }
  | { kind: 'amphibiousResult'; result: AmphibiousResult }
  | { kind: 'error'; message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const respond = (response: WorkerResponse): void => self.postMessage(response);
  try {
    const message = event.data;
    if (message.kind === 'calculate') {
      respond({ kind: 'result', result: runCalculation(message.input) });
    } else if (message.kind === 'advise') {
      respond({ kind: 'advice', rows: runAdvisor(message.input, UNIT_CATALOG) });
    } else {
      respond({ kind: 'amphibiousResult', result: runAmphibiousCalculation(message.input, UNIT_CATALOG) });
    }
  } catch (err) {
    respond({
      kind: 'error',
      message: err instanceof Error ? err.message : 'Unknown error during calculation',
    });
  }
};
