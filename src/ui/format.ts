/**
 * Formats an expected unit count: up to `maxDecimals` places, with trailing
 * zeros (and a bare trailing dot) trimmed — 6.0 → "6", 0.0 → "0", 1.2 → "1.2".
 */
export function formatCount(value: number, maxDecimals = 1): string {
  const fixed = value.toFixed(maxDecimals);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}
