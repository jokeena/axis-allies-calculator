/**
 * Safety-valve cap on rounds per phase, purely to guard against pathological
 * standoffs (e.g. a single low-hit-chance unit vs. another) looping forever.
 * Real battles with normal army sizes resolve long before this. This is NOT
 * a gameplay rule — unlike the old site's artificial 10-round cutoff, this
 * calculator lets battles run to their natural conclusion.
 */
export const ROUND_CAP = 100;

export const DEFAULT_TRIALS = 100_000;
