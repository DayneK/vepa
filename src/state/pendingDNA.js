import { DNA_COUNT, DNA_META, DNA_RANGES, MAX_SPECIES } from '../constants.js';
import { readDNAParam, writeDNAParam } from '../dna/codec.js';

/** Session-only per-species genome overrides; never mutate the live DNA buffer. */
export function wirePendingDNA(bus, { getLive }) {
  const pending = new Map();
  const keyFor = (species, param) => `${species}:${param}`;
  const snapshot = () => [...pending.values()].map(({ species, param, value }) => ({
    species,
    param,
    label: DNA_META[param] || `DNA_${param}`,
    liveValue: readDNAParam(getLive(), species, param),
    value,
  }));
  const publish = () => bus.emit('dna:pending', { changes: snapshot() });
  const reset = () => {
    pending.clear();
    publish();
  };
  bus.on('dna:editRequested', ({ species, param, value } = {}) => {
    if (!Number.isInteger(species) || species < 0 || species >= MAX_SPECIES
      || !Number.isInteger(param) || param < 0 || param >= DNA_COUNT
      || typeof value !== 'number' || !Number.isFinite(value)) {
      bus.emit('dna:editRejected', { reason: 'Expected a finite value for a known species and DNA parameter.' });
      return;
    }
    const range = DNA_RANGES[param];
    const accepted = Math.max(range.min, Math.min(range.max, value));
    const key = keyFor(species, param);
    if (accepted === readDNAParam(getLive(), species, param)) pending.delete(key);
    else pending.set(key, { species, param, value: accepted });
    publish();
  });
  const stage = (changes, { replace = false } = {}) => {
    if (!Array.isArray(changes) || !changes.every(({ species, param, value } = {}) =>
      Number.isInteger(species) && species >= 0 && species < MAX_SPECIES
      && Number.isInteger(param) && param >= 0 && param < DNA_COUNT
      && typeof value === 'number' && Number.isFinite(value))) return false;
    if (replace) pending.clear();
    for (const { species, param, value } of changes) {
      const range = DNA_RANGES[param];
      const accepted = Math.max(range.min, Math.min(range.max, value));
      const key = keyFor(species, param);
      if (accepted === readDNAParam(getLive(), species, param)) pending.delete(key);
      else pending.set(key, { species, param, value: accepted });
    }
    publish();
    return true;
  };
  bus.on('dna:replacePending', ({ changes = [] } = {}) => {
    if (!stage(changes, { replace: true })) {
      bus.emit('dna:editRejected', { reason: 'Expected finite values for known species and DNA parameters.' });
    }
  });
  bus.on('dna:mergePending', ({ changes = [] } = {}) => {
    if (!stage(changes)) {
      bus.emit('dna:editRejected', { reason: 'Expected finite values for known species and DNA parameters.' });
    }
  });
  bus.on('dna:pendingRequested', publish);
  bus.on('dna:readProposed', (request = {}) => {
    if (Number.isInteger(request.species) && Number.isInteger(request.param)) {
      request.value = pending.get(keyFor(request.species, request.param))?.value
        ?? readDNAParam(getLive(), request.species, request.param);
    }
  });
  // Other existing configuration paths still write the genome directly; when
  // they announce a committed DNA change, discard candidates that now match it.
  bus.on('dna:changed', () => {
    for (const [key, { species, param, value }] of pending) {
      if (value === readDNAParam(getLive(), species, param)) pending.delete(key);
    }
    publish();
  });
  bus.on('dna:discardPending', reset);
  bus.on('world:discardPending', reset);
  bus.on('world:restored', reset);
  publish();

  return {
    stage,
    snapshot,
    read(species, param) {
      return pending.get(keyFor(species, param))?.value ?? readDNAParam(getLive(), species, param);
    },
    discardSpecies(species) {
      for (const [key, change] of pending) {
        if (change.species === species) pending.delete(key);
      }
      publish();
    },
    hasChanges() { return pending.size > 0; },
    clear: reset,
    commit() {
      const changes = snapshot();
      const buffer = getLive();
      for (const { species, param, value } of changes) writeDNAParam(buffer, species, param, value);
      reset();
      return changes;
    },
  };
}
