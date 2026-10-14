import { DEFAULT_DNA_STRIDE, DNA_COUNT, DNA_RANGES, MAX_SPECIES } from '../constants.js';

/** Session-only roster proposals; genome changes share the pendingDNA batch. */
export function wirePendingSpeciesRoster(bus, { getCount, pendingDNA }) {
  let proposedCount = null;
  const count = () => proposedCount ?? getCount();
  const publish = () => bus.emit('species:pending', {
    liveCount: getCount(),
    proposedCount,
    changes: proposedCount === null ? 0 : proposedCount - getCount(),
  });
  const read = (species, param) => pendingDNA.read(species, param);
  const replace = (nextCount, genome = null, { replaceGenome = true } = {}) => {
    if (!Number.isInteger(nextCount) || nextCount < 1 || nextCount > MAX_SPECIES) return false;
    const hasGenome = genome !== null && genome !== undefined;
    const indexedObject = hasGenome && !Array.isArray(genome) && !ArrayBuffer.isView(genome)
      && typeof genome === 'object' ? genome : null;
    const genomeLength = Array.isArray(genome) || ArrayBuffer.isView(genome)
      ? genome.length
      : indexedObject ? Object.keys(indexedObject).reduce((max, key) => /^\d+$/.test(key) ? Math.max(max, Number(key) + 1) : max, 0) : 0;
    if (hasGenome && genomeLength < nextCount * DEFAULT_DNA_STRIDE) return false;
    const readRaw = (index) => indexedObject ? indexedObject[index] : genome[index];
    const genomeChanges = [];
    if (hasGenome) {
      for (let species = 0; species < nextCount; species += 1) {
        for (let param = 0; param < DNA_COUNT; param += 1) {
          const raw = readRaw(species * DEFAULT_DNA_STRIDE + param);
          if (!Number.isInteger(raw) || raw < 0 || raw > 65535) return false;
          const range = DNA_RANGES[param];
          genomeChanges.push({ species, param, value: range.min + (raw / 65535) * (range.max - range.min) });
        }
      }
    }
    if (replaceGenome) {
      if (!pendingDNA.stage(genomeChanges, { replace: true })) return false;
    } else if (hasGenome && !pendingDNA.stage(genomeChanges)) return false;
    if (nextCount !== getCount()) bus.emit('species:aboutToChange');
    proposedCount = nextCount === getCount() ? null : nextCount;
    publish();
    return true;
  };

  bus.on('species:rosterEditRequested', ({ operation, species } = {}) => {
    const current = count();
    if (operation === 'add') {
      if (current >= MAX_SPECIES) {
        bus.emit('species:rosterEditRejected', { reason: `The species roster is limited to ${MAX_SPECIES}.` });
        return;
      }
      const next = current;
      const genome = Array.from({ length: DNA_COUNT }, (_, param) => ({
        species: next,
        param,
        value: read(0, param),
      }));
      if (!pendingDNA.stage(genome)) {
        bus.emit('species:rosterEditRejected', { reason: 'The proposed genome could not be staged.' });
        return;
      }
      if (current === getCount()) bus.emit('species:aboutToChange');
      proposedCount = current + 1;
      publish();
      bus.emit('narrative:system', { text: `Species ${proposedCount} staged from Species 1; restart to apply.` });
      return;
    }
    if (operation === 'remove') {
      if (!Number.isInteger(species) || species < 0 || species >= current || current <= 1) {
        bus.emit('species:rosterEditRejected', { reason: 'Choose a species in the proposed roster; at least one must remain.' });
        return;
      }
      const edits = [];
      for (let target = 0; target < current - 1; target += 1) {
        const source = target < species ? target : target < current - 1 ? target + 1 : -1;
        for (let param = 0; param < DNA_COUNT; param += 1) {
          edits.push({
            species: target,
            param,
            value: source >= 0 && source < current ? read(source, param) : DNA_RANGES[param].default,
          });
        }
      }
      for (let param = 0; param < DNA_COUNT; param += 1) {
        edits.push({ species: current - 1, param, value: DNA_RANGES[param].default });
      }
      if (!pendingDNA.stage(edits, { replace: true })) {
        bus.emit('species:rosterEditRejected', { reason: 'The proposed genome could not be staged.' });
        return;
      }
      if (current - 1 !== getCount()) bus.emit('species:aboutToChange');
      proposedCount = current - 1 === getCount() ? null : current - 1;
      publish();
      bus.emit('narrative:system', { text: `Species ${species + 1} removal staged; restart to apply.` });
      return;
    }
    bus.emit('species:rosterEditRejected', { reason: 'Unknown roster operation.' });
  });

  bus.on('species:replacePending', ({ speciesCount, dna } = {}) => {
    if (!replace(speciesCount, dna, { replaceGenome: true })) {
      bus.emit('species:rosterEditRejected', { reason: 'Preset roster or genome data is invalid.' });
    }
  });
  const reset = () => {
    proposedCount = null;
    publish();
  };
  bus.on('species:discardPending', reset);
  bus.on('world:discardPending', reset);
  bus.on('world:restored', reset);
  bus.on('species:pendingRequested', publish);
  publish();

  return {
    get proposedCount() { return proposedCount; },
    get count() { return count(); },
    replace,
    snapshot: () => ({ liveCount: getCount(), proposedCount, changes: proposedCount === null ? 0 : proposedCount - getCount() }),
    discard: reset,
    commit() {
      const applied = proposedCount === null ? getCount() : proposedCount;
      proposedCount = null;
      publish();
      return applied;
    },
  };
}
