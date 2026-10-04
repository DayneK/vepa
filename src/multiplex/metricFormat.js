/**
 * NaN-1 (D-026): display formatting for multiplex metric readouts.
 *
 * Any value that is missing (null / undefined) or non-finite (NaN, ±Infinity)
 * renders as an em dash instead of "NaN" — e.g. ΔSEL / ΔAVG before a prior
 * value exists, or a shard whose metrics could not be computed.
 */
export const NO_VALUE = '—';

export function formatMetric(value, digits = 2) {
  if (value === null || value === undefined || value === '') return NO_VALUE;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : NO_VALUE;
}

/**
 * Parse a numeric form value, falling back only when it is not a number.
 * Unlike `parseFloat(v) || fallback`, a deliberate 0 stays 0 (D-028: the
 * LAWS / DNA / POPULATION / WORLD PARAMS variation sliders could not be set
 * to 0% — the `|| 1` read turned 0 back into 100%).
 */
export function numberOr(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
