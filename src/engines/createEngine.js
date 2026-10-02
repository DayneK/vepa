// CA-A7: shared factory for the bus-driven analysis engines (insight,
// narrative, goal, timeline). Every engine handle has the same spine:
// { bus, cfg: { ...DEFAULTS, ...config }, frame: 0, ...engine-specific state }.
// The engines keep their own public create*/update* functions; only the
// construction boilerplate is shared.

/**
 * @param {object|null} bus      EventBus (stored as-is)
 * @param {object} defaults      engine DEFAULTS
 * @param {object} [config]      caller overrides (shallow-merged over defaults)
 * @param {object|function(object): object} [state]  extra fields, or a function
 *   of the merged cfg returning them
 * @returns {object} engine handle
 */
export function createEngine(bus, defaults, config = {}, state = {}) {
  const cfg = { ...defaults, ...config };
  const extra = typeof state === 'function' ? state(cfg) : state;
  return { bus, cfg, frame: 0, ...extra };
}
