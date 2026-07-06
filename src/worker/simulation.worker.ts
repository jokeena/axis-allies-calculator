import { runCalculation } from '../engine';
import type { BattleInput } from '../engine';

self.onmessage = (event: MessageEvent<BattleInput>) => {
  try {
    const result = runCalculation(event.data);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : 'Unknown error during calculation' });
  }
};
