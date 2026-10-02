#!/usr/bin/env node
// Chaos Multiplex headless sim benchmark (AC-95 / MX-20, sim half).
//
//   node bench/multiplex-bench.mjs [--shards 20] [--pop 2500] [--frames 300]
//        [--warmup 60] [--laws tidal|none] [--field-once] [--json]
//
// Builds a cols×rows multiplex (clone mode, default TIDAL_BLOOM laws and
// params) whose shards each hold `pop` particles, then times stepMultiplex()
// per frame. Reports median / p95 / max frame ms and ticks advanced per shard.
// Rendering is measured separately in the browser (tests/bench/multiplex.bench.js).
import { performance } from 'node:perf_hooks';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SHARDS = +arg('shards', 20), POP = +arg('pop', 2500), FRAMES = +arg('frames', 300), WARMUP = +arg('warmup', 60);
const LAWS = arg('laws', 'tidal'), JSON_OUT = process.argv.includes('--json');
const FIELD_ONCE = process.argv.includes('--field-once');

const { PARTICLE_STRIDE, STRIDE_INDEXES: S, DNA_RANGES, LAW_INDEXES, WORLD_SIZE } = await import('../src/constants.js');
const { createLawState, set: setLaw } = await import('../src/state/lawState.js');
const { createDNABuffer, loadDefaults, getDNAFloat } = await import('../src/dna/dnaBuffer.js');
const { TIDAL_BLOOM } = await import('../src/state/defaultPresets.js');
const { runtimeConfig } = await import('../src/state/runtimeConfig.js');
const { createWorldParams } = await import('../src/state/worldParams.js');
const mxMod = await import('../src/multiplex/multiplex.js');
const { SplitMix32 } = await import('../src/core/prng.js');

function source() {
  const g = new SplitMix32(20261003);
  const view = new Float32Array(POP * PARTICLE_STRIDE);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  for (let i = 0; i < POP; i++) {
    const b = i * PARTICLE_STRIDE, s = i % 5;
    view[b + S.POS_X] = g.nextFloat(5, WORLD_SIZE - 5);
    view[b + S.POS_Y] = g.nextFloat(5, WORLD_SIZE - 5);
    view[b + S.POS_Z] = g.nextFloat(5, WORLD_SIZE - 5);
    view[b + S.MASS] = 1 + g.next(); view[b + S.ENERGY] = 50 + g.next() * 50;
    view[b + S.RADIUS] = 0.6; view[b + S.SPECIES_ID] = s;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
    for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, s, d, r.min, r.max); }
  }
  const laws = createLawState();
  if (LAWS === 'tidal') for (const n of TIDAL_BLOOM.laws) if (LAW_INDEXES[n] !== undefined) setLaw(laws, LAW_INDEXES[n]);
  return { view, count: POP, dna, laws, speciesCount: 5 };
}

runtimeConfig.fieldAdvanceOnce = FIELD_ONCE;
runtimeConfig.worldParams = { ...createWorldParams(), ...(LAWS === 'tidal' ? TIDAL_BLOOM.worldParams : {}) };
const cols = Math.ceil(Math.sqrt(SHARDS)), rows = Math.ceil(SHARDS / cols);
const mx = mxMod.createMultiplex(null);
const memBefore = process.memoryUsage().rss;
mxMod.startMultiplex(mx, source(), {
  ...mxMod.MULTIPLEX_DEFAULTS, cols, rows, seed: 7, variation: 0.3, randomizeLaws: LAWS !== 'none', populationScale: 1, populationPercent: POP / 1000, // POP / 100k × 100 %
}, null);
const built = mx.shards.length;
const counts = mx.shards.map((s) => s.count);
const memMB = (process.memoryUsage().rss - memBefore) / 1048576;
const t = [];
const tick0 = mx.shards.map((s) => s.tick);
for (let f = 0; f < WARMUP + FRAMES; f++) {
  const a = performance.now();
  mxMod.stepMultiplex(mx, 1 / 60, 1, WORLD_SIZE);
  if (f >= WARMUP) t.push(performance.now() - a);
}
if (mxMod.flushMultiplex) await mxMod.flushMultiplex(mx);
t.sort((a, b) => a - b);
const q = (p) => t[Math.min(t.length - 1, Math.floor(p * t.length))];
const ticks = mx.shards.map((s, i) => s.tick - tick0[i]);
const out = {
  shardsRequested: SHARDS, shardsBuilt: built, maxShards: mxMod.MAX_SHARDS, popPerShard: Math.min(...counts) + '-' + Math.max(...counts),
  laws: LAWS, fieldAdvanceOnce: FIELD_ONCE, frames: FRAMES, medianMs: +q(0.5).toFixed(2), p95Ms: +q(0.95).toFixed(2), maxMs: +t[t.length - 1].toFixed(2),
  ticksPerShard: Math.min(...ticks) + '-' + Math.max(...ticks), shardBufferMB: +((mx.shards[0].view.byteLength) / 1048576).toFixed(1),
  rssDeltaMB: +memMB.toFixed(0), alive: mx.shards.reduce((a, s) => a + s.count, 0),
};
if (mxMod.stopMultiplex) mxMod.stopMultiplex(mx);
console.log(JSON_OUT ? JSON.stringify(out) : out);
process.exit(0);
