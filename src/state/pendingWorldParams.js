import { WORLD_PARAM_DEFS, clampWorldParam, spawnCaps } from './worldParams.js';

const DEFINITIONS = new Map(WORLD_PARAM_DEFS.map((definition) => [definition.key, definition]));
const POPULATION_KEYS = new Set(['PARTICLE_COUNT', 'MAX_POP', 'INITIAL_POP']);

/** Session-only overrides: never mutate the live world, storage, or worker. */
export function createPendingWorldParams(getLive) {
  const pending = new Map();
  const candidate = () => {
    const values = { ...getLive(), ...Object.fromEntries(pending) };
    if (![...POPULATION_KEYS].some((key) => pending.has(key))) return values;
    const { hardCap, softCap } = spawnCaps(values);
    values.PARTICLE_COUNT = hardCap;
    values.MAX_POP = Math.min(softCap, hardCap);
    values.INITIAL_POP = Math.min(values.INITIAL_POP, softCap, hardCap);
    return values;
  };
  return {
    stage(key, value) {
      if (!DEFINITIONS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) return false;
      const accepted = clampWorldParam(key, value);
      if (accepted === getLive()[key]) pending.delete(key);
      else pending.set(key, accepted);
      return true;
    },
    snapshot() {
      const values = candidate();
      return [...pending.keys()]
        .filter((key) => values[key] !== getLive()[key])
        .map((key) => ({
          key,
          label: DEFINITIONS.get(key).label,
          liveValue: getLive()[key],
          value: values[key],
        }))
        .concat([...POPULATION_KEYS]
          .filter((key) => !pending.has(key) && values[key] !== getLive()[key])
          .map((key) => ({
            key,
            label: DEFINITIONS.get(key).label,
            liveValue: getLive()[key],
            value: values[key],
          })));
    },
    clear() { pending.clear(); },
  };
}

/** Only the session coordinator calls commit, after stopping the worker. */
export function wirePendingWorldParams(bus, { getLive, apply }) {
  const pending = createPendingWorldParams(getLive);
  const publish = () => bus.emit('world:paramsPending', { changes: pending.snapshot() });
  const reset = () => {
    pending.clear();
    publish();
  };
  const stage = (changes, { replace = false } = {}) => {
    if (!Array.isArray(changes) || !changes.every(({ key, value } = {}) =>
      DEFINITIONS.has(key) && typeof value === 'number' && Number.isFinite(value))) return false;
    if (replace) pending.clear();
    const populationChanges = changes.filter(({ key }) => POPULATION_KEYS.has(key));
    for (const { key, value } of changes.filter(({ key }) => !POPULATION_KEYS.has(key))) pending.stage(key, value);
    for (const { key, value } of populationChanges) pending.stage(key, value);
    publish();
    return true;
  };
  bus.on('world:paramChanged', ({ key, value }) => {
    if (pending.stage(key, value)) publish();
  });
  bus.on('world:replacePending', ({ changes = [] } = {}) => {
    if (!stage(changes, { replace: true })) {
      bus.emit('world:paramEditRejected', { reason: 'Expected finite values for known WORLD parameters.' });
    }
  });
  bus.on('world:mergePending', ({ changes = [] } = {}) => {
    if (!stage(changes)) bus.emit('world:paramEditRejected', { reason: 'Expected finite values for known WORLD parameters.' });
  });
  bus.on('world:pendingRequested', publish);
  bus.on('world:discardPending', () => {
    reset();
    bus.emit('world:paramsRestored');
  });
  bus.on('world:restored', () => {
    reset();
    bus.emit('world:paramsRestored');
  });
  publish();
  return {
    stage,
    snapshot: pending.snapshot,
    clear: reset,
    commit() {
      const changes = pending.snapshot();
      for (const { key, value } of changes) apply({ key, value });
      reset();
      bus.emit('world:paramsRestored');
      return changes;
    },
  };
}
