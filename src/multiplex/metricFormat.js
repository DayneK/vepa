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
