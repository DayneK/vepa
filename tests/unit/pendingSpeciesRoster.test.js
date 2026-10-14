import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/eventBus.js';
import { DNA_COUNT, DNA_RANGES, DEFAULT_DNA_STRIDE, MAX_SPECIES } from '../../src/constants.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { readDNAParam, writeDNAParam } from '../../src/dna/codec.js';
import { wirePendingDNA } from '../../src/state/pendingDNA.js';
import { wirePendingSpeciesRoster } from '../../src/state/pendingSpeciesRoster.js';

describe('restart-staged species roster', () => {
  function fixture(count = 3) {
    const bus = new EventBus();
    let liveCount = count;
    const liveDNA = createDNABuffer();
    loadDefaults(liveDNA, DNA_RANGES);
    const dna = wirePendingDNA(bus, { getLive: () => liveDNA });
    const roster = wirePendingSpeciesRoster(bus, { getCount: () => liveCount, pendingDNA: dna });
    return {
      bus,
      liveDNA,
      dna,
      roster,
      setLiveCount(value) { liveCount = value; },
      liveCount: () => liveCount,
    };
  }

  it('stages add from the proposed first genome without changing live count or DNA', () => {
    const f = fixture();
    writeDNAParam(f.liveDNA, 0, 0, DNA_RANGES[0].max);
    const liveBefore = f.liveDNA.slice();

    f.bus.emit('species:rosterEditRequested', { operation: 'add' });

    expect(f.roster.count).toBe(4);
    expect(f.roster.snapshot()).toEqual({ liveCount: 3, proposedCount: 4, changes: 1 });
    expect(f.liveDNA).toEqual(liveBefore);
    expect(f.dna.read(3, 0)).toBe(f.dna.read(0, 0));
    expect(f.dna.snapshot()).toHaveLength(1);
    expect(f.roster.commit()).toBe(4);
    expect(f.liveDNA).toEqual(liveBefore);
    expect(f.dna.commit()).toHaveLength(1);
    expect(readDNAParam(f.liveDNA, 3, 0)).toBe(DNA_RANGES[0].max);
  });

  it('stages removal by compacting the remaining roster and defaults the freed DNA slot', () => {
    const f = fixture();
    writeDNAParam(f.liveDNA, 0, 0, DNA_RANGES[0].min);
    writeDNAParam(f.liveDNA, 1, 0, DNA_RANGES[0].max);
    writeDNAParam(f.liveDNA, 2, 0, DNA_RANGES[0].default);
    const before = f.liveDNA.slice();

    f.bus.emit('species:rosterEditRequested', { operation: 'remove', species: 1 });

    expect(f.roster.count).toBe(2);
    expect(f.liveCount()).toBe(3);
    expect(f.liveDNA).toEqual(before);
    expect(f.dna.read(0, 0)).toBe(readDNAParam(before, 0, 0));
    expect(f.dna.read(1, 0)).toBe(readDNAParam(before, 2, 0));
    expect(f.dna.read(2, 0)).toBe(DNA_RANGES[0].default);
    f.dna.commit();
    expect(f.roster.commit()).toBe(2);
  });

  it('replaces the whole candidate from a valid preset genome and rejects malformed presets atomically', () => {
    const f = fixture();
    f.bus.emit('dna:editRequested', { species: 0, param: 0, value: DNA_RANGES[0].max });
    const presetGenome = Array.from(f.liveDNA);
    presetGenome[0] = 0;
    presetGenome[DEFAULT_DNA_STRIDE] = 65535;
    f.bus.emit('species:replacePending', { speciesCount: 2, dna: presetGenome });

    expect(f.roster.count).toBe(2);
    expect(f.dna.snapshot()).toHaveLength(2);
    expect(f.dna.read(0, 0)).toBe(DNA_RANGES[0].min);
    expect(f.dna.read(1, 0)).toBe(DNA_RANGES[0].max);

    const stagedBefore = f.dna.snapshot();
    const rejected = [];
    f.bus.on('species:rosterEditRejected', (event) => rejected.push(event));
    const malformed = Array.from(presetGenome);
    malformed[0] = -1;
    f.bus.emit('species:replacePending', { speciesCount: 2, dna: malformed });
    expect(f.dna.snapshot()).toEqual(stagedBefore);
    expect(rejected).toHaveLength(1);
    expect(f.liveDNA[0]).not.toBe(0);
  });

  it('discards genome and roster proposals without touching live state', () => {
    const f = fixture();
    const before = f.liveDNA.slice();
    f.bus.emit('species:rosterEditRequested', { operation: 'add' });
    expect(f.roster.count).toBe(4);

    f.bus.emit('world:discardPending');

    expect(f.roster.count).toBe(3);
    expect(f.roster.snapshot()).toEqual({ liveCount: 3, proposedCount: null, changes: 0 });
    expect(f.dna.snapshot()).toEqual([]);
    expect(f.liveDNA).toEqual(before);
  });

  it('rejects adding beyond the species limit and removing the last species', () => {
    const full = fixture(MAX_SPECIES);
    const rejected = [];
    full.bus.on('species:rosterEditRejected', (event) => rejected.push(event));
    full.bus.emit('species:rosterEditRequested', { operation: 'add' });
    expect(full.roster.count).toBe(MAX_SPECIES);
    expect(full.dna.snapshot()).toEqual([]);

    const single = fixture(1);
    single.bus.on('species:rosterEditRejected', (event) => rejected.push(event));
    single.bus.emit('species:rosterEditRequested', { operation: 'remove', species: 0 });
    expect(single.roster.count).toBe(1);
    expect(single.dna.snapshot()).toEqual([]);
    expect(rejected).toHaveLength(2);
  });
});
