// MX-20 (AC-95, structural part): 20 sims at 25% (2,500) of the default population (10,000 since v9.3.1)
// fit in the grid, and shard memory scales with the shard cap.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE, MAX_PARTICLES, STRIDE_INDEXES as S } from '../../src/constants.js';
import { createDNABuffer } from '../../src/dna/dnaBuffer.js';
import { createLawState } from '../../src/state/lawState.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import {
  createMultiplex, startMultiplex, stepMultiplex, snapshotShard, restoreShard, computeShardPopulationCap,
  MULTIPLEX_DEFAULTS, MAX_SHARDS, SHARD_BUFFER_HEADROOM,
} from '../../src/multiplex/multiplex.js';

function source(n) {
  const view = new Float32Array(n * PARTICLE_STRIDE);
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 100 + (i % 50) * 3; view[b + S.POS_Y] = 100 + ((i / 50) | 0) * 3; view[b + S.POS_Z] = 300;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 80; view[b + S.SPECIES_ID] = i % 2;
  }
  return { view, count: n, dna: createDNABuffer(), laws: createLawState(), speciesCount: 2 };
}

describe('multiplex at scale (MX-20)', () => {
  it('allows at least 20 shards and a 5×4 grid', () => {
    expect(MAX_SHARDS).toBeGreaterThanOrEqual(20);
    const mx = createMultiplex(null);
    startMultiplex(mx, source(10), { ...MULTIPLEX_DEFAULTS, cols: 5, rows: 4, variation: 0 }, null);
    expect(mx.shards.length).toBe(20);
  });

  it('populationPercent 25 caps every shard at 2,500 particles regardless of grid size (MAX_PARTICLES 10,000 since v9.3.1)', () => {
    expect(computeShardPopulationCap(20, 1, 25)).toBe(2500);
    expect(computeShardPopulationCap(1, 0.25, 25)).toBe(2500);
    expect(computeShardPopulationCap(20, 1, 0)).toBe(computeShardPopulationCap(20, 1)); // 0 = legacy curve
    const mx = createMultiplex(null);
    startMultiplex(mx, source(3000), { ...MULTIPLEX_DEFAULTS, cols: 5, rows: 4, variation: 0, populationPercent: 25 }, null);
    for (const sh of mx.shards) {
      expect(sh.maxCount).toBe(2500);
      expect(sh.count).toBe(2500);
    }
  });

  it('shard buffers are sized to the cap, not MAX_PARTICLES', () => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(100), { ...MULTIPLEX_DEFAULTS, cols: 5, rows: 4, variation: 0, populationPercent: 25 }, null);
    for (const sh of mx.shards) {
      expect(sh.view.length).toBe((2500 + SHARD_BUFFER_HEADROOM) * PARTICLE_STRIDE);
      expect(sh.view.length).toBeLessThan(MAX_PARTICLES * PARTICLE_STRIDE);
    }
  });

  it('restoreShard grows a cap-sized buffer when a snapshot is larger', () => {
    const big = createMultiplex(null);
    startMultiplex(big, source(600), { ...MULTIPLEX_DEFAULTS, cols: 1, rows: 1, variation: 0, populationPercent: 10 }, null);
    const snap = snapshotShard(big.shards[0]);
    const small = createMultiplex(null);
    startMultiplex(small, source(10), { ...MULTIPLEX_DEFAULTS, cols: 1, rows: 1, variation: 0, populationPercent: 0.1 }, null);
    const sh = small.shards[0];
    expect(sh.view.length).toBeLessThan(snap.view.length);
    restoreShard(sh, snap);
    expect(sh.view.length).toBeGreaterThanOrEqual(snap.view.length);
    expect(sh.count).toBe(600);
    expect(sh.view[S.POS_X]).toBe(snap.view[S.POS_X]);
  });

  it('stepping 20 shards advances every shard exactly one tick per frame', () => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(50), { ...MULTIPLEX_DEFAULTS, cols: 5, rows: 4, variation: 0, populationPercent: 25 }, null);
    for (let f = 0; f < 3; f++) stepMultiplex(mx, 1 / 60, 1, 2000);
    for (const sh of mx.shards) expect(sh.tick).toBe(3);
  });

  it('fieldAdvanceOnce defaults to true (FIELD-ONCE, D-016)', () => {
    expect(runtimeConfig.fieldAdvanceOnce).toBe(true);
  });
});
