import type { Rng } from './rng';

/**
 * Deterministic RNG for tests: returns a scripted sequence of die rolls in
 * order. Throws if more rolls are requested than were scripted, so tests
 * fail loudly instead of silently reading past the intended scenario.
 */
export function createScriptedRng(rolls: number[]): Rng {
  let index = 0;
  return {
    next: () => {
      throw new Error('next() is not supported by the scripted test RNG, use rollDie()');
    },
    rollDie: () => {
      if (index >= rolls.length) {
        throw new Error(`Scripted RNG exhausted after ${rolls.length} rolls`);
      }
      return rolls[index++];
    },
  };
}
