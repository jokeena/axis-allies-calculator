export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer die roll in [1, 6]. */
  rollDie(): number;
}

function rngFromNext(next: () => number): Rng {
  return {
    next,
    rollDie: () => Math.floor(next() * 6) + 1,
  };
}

/** Default RNG for production use — backed by Math.random(). */
export const defaultRng: Rng = rngFromNext(Math.random);

/**
 * Deterministic seedable RNG (mulberry32) for tests — same seed always
 * produces the same sequence of rolls, so exact battle outcomes can be
 * asserted against hand-computed expectations.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return rngFromNext(next);
}
