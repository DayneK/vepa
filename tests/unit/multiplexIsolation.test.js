// HIDDEN-STATE (AC-97) + worker pool (AC-95): each multiplex sim has isolated
// solver state, and the worker pool reproduces the in-thread result exactly.
import { describe, it, expect, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { createWorldParams } from '../../src/state/worldParams.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import { TIDAL_BLOOM } from '../../src/state/defaultPresets.js';
import { solve } from '../../src/physics/solver.js';
import { resetFields } from '../../src/physics/fields.js';
import {
  createMultiplex, startMultiplex, stopMultiplex, stepMultiplex, frameMultiplex, settleMultiplex, setMultiplexPool, MULTIPLEX_DEFAULTS,
} from '../../src/multiplex/multiplex.js';
import { createShardPool } from '../../src/multiplex/shardPool.js';
import { nodeSpawn } from '../../bench/multiplex-node-pool.mjs';

const savedWP = runtimeConfig.worldParams;
afterEach(() => { runtimeConfig.worldParams = savedWP; resetFields(); });

function source(n = 120) {
  const view = new Float32Array(n * PARTICLE_STRIDE);
  let s = 12345;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 800 + r() * 400; view[b + S.POS_Y] = 800 + r() * 400; view[b + S.POS_Z] = 800 + r() * 400;
    view[b + S.MASS] = 1 + r(); view[b + S.ENERGY] = 70; view[b + S.RADIUS] = 0.7; view[b + S.SPECIES_ID] = i % 3;
    view[b + S.TEMPERATURE] = 0.5;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  }
  const laws = createLawState();
  for (const name of [...TIDAL_BLOOM.laws, 'HISTORY']) lawSet(laws, LAW_INDEXES[name]);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  return { view, count: n, dna, laws, speciesCount: 3, worldParams: { ...createWorldParams(), ...TIDAL_BLOOM.worldParams } };
}

const cfg = (cols) => ({ ...MULTIPLEX_DEFAULTS, cols, rows: 1, seed: 99, variation: 0.4, randomizeLaws: false });
const hash = (shard) => createHash('sha256').update(Buffer.from(shard.view.buffer, 0, shard.count * PARTICLE_STRIDE * 4)).digest('hex');

describe('multiplex sim isolation (HIDDEN-STATE, AC-97)', () => {
  it('a sim evolves identically whether or not other sims and the main world step in between', () => {
    runtimeConfig.worldParams = { ...createWorldParams(), ...TIDAL_BLOOM.worldParams };
    const alone = createMultiplex(null);
    startMultiplex(alone, source(), cfg(1), null);
    for (let t = 0; t < 8; t++) stepMultiplex(alone, 1 / 60, 1, 2000);

    const crowded = createMultiplex(null);
    startMultiplex(crowded, source(), cfg(3), null);
    const main = source(200);
    for (let t = 0; t < 8; t++) {
      stepMultiplex(crowded, 1 / 60, 1, 2000);
      // The main world (default solver context) steps in between.
      solve(main.view, main.count, PARTICLE_STRIDE, main.laws, main.dna, 2000, 1 / 60, () => 0.37);
    }
    expect(crowded.shards[0].tick).toBe(8);
    expect(hash(crowded.shards[0])).toBe(hash(alone.shards[0]));
    stopMultiplex(alone); stopMultiplex(crowded);
  });
});

describe('multiplex worker pool (MX-20)', () => {
  it('the pool reproduces the in-thread run bit for bit', async () => {
    runtimeConfig.worldParams = { ...createWorldParams(), ...TIDAL_BLOOM.worldParams };
    const local = createMultiplex(null);
    startMultiplex(local, source(), cfg(3), null);
    for (let t = 0; t < 6; t++) stepMultiplex(local, 1 / 60, 1, 2000);

    const pooled = createMultiplex(null);
    startMultiplex(pooled, source(), { ...cfg(3), tickMode: 'frame' }, null);
    setMultiplexPool(pooled, createShardPool({ size: 2, spawn: nodeSpawn }));
    try {
      for (let guard = 0; guard < 200 && pooled.shards.some((s) => s.tick < 6); guard++) {
        frameMultiplex(pooled, 1 / 60, 1, 2000);
        await settleMultiplex(pooled, 2000);
      }
      for (let i = 0; i < 3; i++) {
        expect(pooled.shards[i].tick).toBe(6);
        expect(hash(pooled.shards[i])).toBe(hash(local.shards[i]));
        expect(Array.from(pooled.shards[i].dna)).toEqual(Array.from(local.shards[i].dna));
        expect(pooled.shards[i].prng.state).toBe(local.shards[i].prng.state);
      }
    } finally {
      setMultiplexPool(pooled, null);
    }
  }, 60000);
});
