// LAW-PENTA (AC-93): multiplex shards keep Mechanics laws (128-135, pentaFlags)
// through clone, snapshot/restore and copy-to-world, and randomizeLaws varies
// them without touching laws 96-103.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE, MAX_PARTICLES, STRIDE_INDEXES as S, LAW_INDEXES } from '../../src/constants.js';
import { createParticleBuffer } from '../../src/state/particleBuffer.js';
import { createDNABuffer } from '../../src/dna/dnaBuffer.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import {
  createMultiplex, startMultiplex, snapshotShard, restoreShard, copyShardToWorld, MULTIPLEX_DEFAULTS,
} from '../../src/multiplex/multiplex.js';

const MECH = Object.entries(LAW_INDEXES).filter(([, v]) => v >= 128).map(([k]) => k);

function source(laws) {
  const { view } = createParticleBuffer(MAX_PARTICLES, PARTICLE_STRIDE);
  for (let i = 0; i < 4; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 100 + i; view[b + S.POS_Y] = 100; view[b + S.POS_Z] = 100;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 80; view[b + S.SPECIES_ID] = i % 2;
  }
  return { view, count: 4, dna: createDNABuffer(), laws, speciesCount: 2 };
}

function mechLaws() {
  const laws = createLawState();
  lawSet(laws, LAW_INDEXES[MECH[0]]);
  lawSet(laws, LAW_INDEXES[MECH[MECH.length - 1]]);
  return laws;
}

describe('multiplex Mechanics laws (LAW-PENTA)', () => {
  it('there are 8 Mechanics laws at 128-135', () => {
    expect(MECH.length).toBe(8);
  });

  it('cloned shards inherit the source pentaFlags', () => {
    const src = source(mechLaws());
    const mx = createMultiplex(null);
    startMultiplex(mx, src, { ...MULTIPLEX_DEFAULTS, cols: 2, rows: 1, variation: 0 }, null);
    for (const sh of mx.shards) expect(sh.laws.pentaFlags[0]).toBe(src.laws.pentaFlags[0]);
    expect(src.laws.pentaFlags[0]).not.toBe(0);
  });

  it('snapshotShard/restoreShard round-trips pentaFlags', () => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(mechLaws()), { ...MULTIPLEX_DEFAULTS, cols: 1, rows: 1, variation: 0 }, null);
    const sh = mx.shards[0];
    const before = sh.laws.pentaFlags[0];
    const snap = snapshotShard(sh);
    expect(snap.laws.pentaFlags).toBe(before);
    sh.laws.pentaFlags[0] = 0;
    restoreShard(sh, snap);
    expect(sh.laws.pentaFlags[0]).toBe(before);
  });

  it('a snapshot without pentaFlags (older shape) leaves the live word alone', () => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(mechLaws()), { ...MULTIPLEX_DEFAULTS, cols: 1, rows: 1, variation: 0 }, null);
    const sh = mx.shards[0];
    const snap = snapshotShard(sh);
    delete snap.laws.pentaFlags;
    const live = sh.laws.pentaFlags[0];
    restoreShard(sh, snap);
    expect(sh.laws.pentaFlags[0]).toBe(live);
  });

  it('copyShardToWorld copies pentaFlags into the main world', () => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(mechLaws()), { ...MULTIPLEX_DEFAULTS, cols: 1, rows: 1, variation: 0 }, null);
    const target = source(createLawState());
    copyShardToWorld(mx.shards[0], { view: target.view, dna: target.dna, laws: target.laws });
    expect(target.laws.pentaFlags[0]).toBe(mx.shards[0].laws.pentaFlags[0]);
  });

  it('randomizeLaws varies Mechanics laws and keeps flags inside their words', () => {
    const src = source(createLawState());
    const mx = createMultiplex(null);
    startMultiplex(mx, src, {
      ...MULTIPLEX_DEFAULTS, cols: 4, rows: 4, variation: 1, lawVariation: 1, randomizeLaws: true,
    }, null);
    let pentaChanged = 0;
    for (const sh of mx.shards) {
      expect(sh.laws.pentaFlags[0] >>> 0).toBeLessThan(256);
      if (sh.laws.pentaFlags[0] !== 0) pentaChanged++;
    }
    // Before the fix pentaFlags never changed (the flips landed on 96-103).
    expect(pentaChanged).toBeGreaterThan(0);
  });
});
