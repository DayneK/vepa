#!/usr/bin/env node
// Chaos Multiplex headless benchmark (AC-95 / MX-20).
//
//   node bench/multiplex-bench.mjs                      # all presets + combination grid
//   node bench/multiplex-bench.mjs --preset smooth-20   # one preset
//   node bench/multiplex-bench.mjs --grid               # combination grid only
//   node bench/multiplex-bench.mjs --presets            # presets only
//   node bench/multiplex-bench.mjs --legacy --shards 20 --pop 2500   # old lock-step stepMultiplex timing
//   node bench/multiplex-bench.mjs --speed-matrix       # Full fidelity: speed options off / each / all (D-034)
//   node bench/multiplex-bench.mjs --presets --speed all # presets with world speed options on
//   options: --seconds 4  --warmup 1  --workers N  --field-legacy  --json  --md
//
// Real-time loop: a 60 fps frame clock calls frameMultiplex() each frame
// (sims dispatched to a worker_threads pool, or ticked in-thread), measures the
// main-thread cost per frame and the achieved frame interval, and counts sim
// ticks. The main thread here has no rendering; real render frame times are
// measured in Chrome (tests/bench/multiplex.bench.js). Box: see os.cpus().
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes('--' + k);
const SECONDS = +arg('seconds', 4), WARMUP_S = +arg('warmup', 1);
const JSON_OUT = has('json'), MD_OUT = has('md');
const FIELD_ONCE = !has('field-legacy');

const { PARTICLE_STRIDE, STRIDE_INDEXES: S, DNA_RANGES, LAW_INDEXES, WORLD_SIZE } = await import('../src/constants.js');
const { createLawState, set: setLaw } = await import('../src/state/lawState.js');
const { createDNABuffer, loadDefaults, getDNAFloat } = await import('../src/dna/dnaBuffer.js');
const { TIDAL_BLOOM } = await import('../src/state/defaultPresets.js');
const { runtimeConfig } = await import('../src/state/runtimeConfig.js');
const { createWorldParams, SPEED_PARAM_KEYS } = await import('../src/state/worldParams.js');
const mxMod = await import('../src/multiplex/multiplex.js');
const { SplitMix32 } = await import('../src/core/prng.js');
const { createShardPool, defaultPoolSize } = await import('../src/multiplex/shardPool.js');
const { nodeSpawn } = await import('./multiplex-node-pool.mjs');

const CORES = os.cpus().length;
const POOL_SIZE = +arg('workers', 0) || defaultPoolSize(20, CORES);

function source(pop) {
  const g = new SplitMix32(20261003);
  const view = new Float32Array(pop * PARTICLE_STRIDE);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  for (let i = 0; i < pop; i++) {
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
  for (const n of TIDAL_BLOOM.laws) if (LAW_INDEXES[n] !== undefined) setLaw(laws, LAW_INDEXES[n]);
  return { view, count: pop, dna, laws, speciesCount: 5 };
}

runtimeConfig.fieldAdvanceOnce = FIELD_ONCE;
runtimeConfig.worldParams = { ...createWorldParams(), ...TIDAL_BLOOM.worldParams };
const SRC = source(2500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const r2 = (x) => Math.round(x * 100) / 100;

const BASE_WP = { ...runtimeConfig.worldParams };
/** World params with D-034 speed options on: 'none', 'all' or comma-separated keys. */
function speedParams(variant) {
  const wp = { ...BASE_WP };
  if (variant && variant !== 'none') for (const k of (variant === 'all' ? SPEED_PARAM_KEYS : variant.split(','))) {
    if (!SPEED_PARAM_KEYS.includes(k)) throw new Error(`unknown speed option ${k}`);
    wp[k] = 1;
  }
  return wp;
}

async function runCase(name, cfgPatch, speed = arg('speed', 'none')) {
  runtimeConfig.worldParams = speedParams(speed); // shards copy these at start
  const cfg = { ...mxMod.MULTIPLEX_DEFAULTS, seed: 7, variation: 0.3, randomizeLaws: true, ...cfgPatch };
  const mx = mxMod.createMultiplex(null);
  mxMod.startMultiplex(mx, SRC, cfg, null);
  const pool = cfg.useWorkers !== false ? createShardPool({ size: POOL_SIZE, spawn: nodeSpawn }) : null;
  mxMod.setMultiplexPool(mx, pool);
  const FRAME = 1000 / 60;
  const mainMs = [], intervals = [], workerMs = [];
  let t0 = performance.now(), last = t0, frames = 0, tickStart = null, tStart = 0, missed0 = 0;
  const end = t0 + (WARMUP_S + SECONDS) * 1000;
  while (performance.now() < end) {
    const now = performance.now();
    const r = mxMod.frameMultiplex(mx, 1 / 60, 1, WORLD_SIZE, now);
    const measuring = now - t0 >= WARMUP_S * 1000;
    if (measuring) {
      if (tickStart === null) { tickStart = mx.shards.map((s) => s.tick); tStart = now; missed0 = mx.missedTicks || 0; }
      else intervals.push(now - last);
      mainMs.push(r.mainMs);
      for (const s of mx.shards) if (s.lastWorkerMs !== undefined && s._seenMs !== s.tick) { workerMs.push(s.lastWorkerMs); s._seenMs = s.tick; }
      frames++;
    }
    last = now;
    const next = now + FRAME;
    const wait = next - performance.now();
    await sleep(Math.max(0, wait - 1)); // yield to receive worker replies
    while (performance.now() < next) { /* spin to the frame boundary */ }
  }
  const elapsed = (performance.now() - tStart) / 1000;
  const ticks = mx.shards.map((s, i) => s.tick - tickStart[i]);
  const tpsPer = ticks.map((t) => t / elapsed);
  if (pool) { await mxMod.settleMultiplex(mx, WORLD_SIZE, 60000); mxMod.setMultiplexPool(mx, null); }
  // In-thread modes: approximate per-tick sim cost from main-thread time.
  const totalTicks = ticks.reduce((a, b) => a + b, 0);
  const simMsPerTick = pool ? pct(workerMs, 0.5) : (mainMs.reduce((a, b) => a + b, 0) / Math.max(1, totalTicks));
  const out = {
    case: name, speed, sims: mx.shards.length, perSim: mx.populationCap, laws: cfg.lawTier, tick: cfg.tickMode + (pool ? ` / pool ${POOL_SIZE}` : ' / in-thread'),
    mainMedMs: r2(pct(mainMs, 0.5)), mainP95Ms: r2(pct(mainMs, 0.95)),
    frameMedMs: r2(pct(intervals, 0.5)), frameP95Ms: r2(pct(intervals, 0.95)),
    simMsPerTick: r2(simMsPerTick),
    simMsPerFrame: r2((pool ? workerMs.reduce((a, b) => a + b, 0) : mainMs.reduce((a, b) => a + b, 0)) / Math.max(1, frames)),
    tpsPerSim: r2(tpsPer.reduce((a, b) => a + b, 0) / tpsPer.length), tpsMin: r2(Math.min(...tpsPer)),
    missedFrameTicks: (mx.missedTicks || 0) - missed0, frames,
  };
  out.meets60 = out.frameMedMs <= 16.7 && out.frameP95Ms <= 25 && out.mainP95Ms <= 16.7;
  mxMod.stopMultiplex(mx);
  return out;
}

const cases = [];
if (has('legacy')) {
  const SHARDS = +arg('shards', 20), POP = +arg('pop', 2500);
  const cols = Math.ceil(Math.sqrt(SHARDS)), rows = Math.ceil(SHARDS / cols);
  cases.push(['legacy-lockstep', { cols, rows, particlesPerSim: POP, tickMode: 'frame', useWorkers: false }]);
} else if (has('speed-matrix')) {
  const ff = mxMod.applyMultiplexPreset({}, 'full-fidelity');
  for (const v of ['none', ...SPEED_PARAM_KEYS.filter((k) => k !== 'SPEED_FAST'), 'all']) cases.push([`Full fidelity speed=${v}`, ff, v]);
  cases.push(['Full fidelity + light laws', mxMod.applyMultiplexPreset({ fullFidelityLight: true }, 'full-fidelity'), 'none']);
  cases.push(['Full fidelity + light laws + speed=all', mxMod.applyMultiplexPreset({ fullFidelityLight: true }, 'full-fidelity'), 'all']);
} else {
  const only = arg('preset', null);
  const doPresets = only || has('presets') || !has('grid');
  const doGrid = !only && (has('grid') || !has('presets'));
  if (doPresets) for (const id of Object.keys(mxMod.MULTIPLEX_PRESETS)) {
    if (only && only !== id) continue;
    cases.push([`preset ${mxMod.MULTIPLEX_PRESETS[id].label}`, mxMod.applyMultiplexPreset({}, id)]);
    // D-034 option 1: Full fidelity with its light-laws switch on.
    if (id === 'full-fidelity') cases.push(['preset Full fidelity + light laws', mxMod.applyMultiplexPreset({ fullFidelityLight: true }, id)]);
  }
  if (doGrid) for (const perSim of [125, 500, 1000, 2500]) for (const lawTier of ['light', 'full'])
    for (const [tickMode, useWorkers, extra] of [['frame', true, {}], ['adaptive', true, {}], ['adaptive', false, { frameBudgetMs: 8 }], ['fixed', true, { ticksPerSecond: 15 }]]) {
      cases.push([`grid ${perSim}/${lawTier}/${tickMode}${useWorkers ? '' : '-inthread'}`, { cols: 5, rows: 4, particlesPerSim: perSim, lawTier, tickMode, useWorkers, ...extra }]);
    }
}

const results = [];
for (const [name, patch, speed] of cases) {
  const r = await runCase(name, patch, speed);
  results.push(r);
  if (!JSON_OUT && !MD_OUT) console.log(r);
}
if (JSON_OUT) console.log(JSON.stringify({ box: { cpus: CORES, model: os.cpus()[0]?.model, gpu: 'none (headless)' }, pool: POOL_SIZE, fieldAdvanceOnce: FIELD_ONCE, results }));
if (MD_OUT) {
  console.log(`Box: ${CORES} vCPU, no GPU; pool ${POOL_SIZE} workers; FIELD-ONCE ${FIELD_ONCE}; ${SECONDS}s per case after ${WARMUP_S}s warm-up.\n`);
  console.log('| Case | Sims × particles | Laws | Ticks | Main ms med / p95 | Frame ms med / p95 | Sim ms / tick | Sim ms / frame (all sims) | Ticks/s per sim (min) | Skipped | 60 fps |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) console.log(`| ${r.case} | ${r.sims} × ${r.perSim} | ${r.laws} | ${r.tick} | ${r.mainMedMs} / ${r.mainP95Ms} | ${r.frameMedMs} / ${r.frameP95Ms} | ${r.simMsPerTick} | ${r.simMsPerFrame} | ${r.tpsPerSim} (${r.tpsMin}) | ${r.missedFrameTicks} | ${r.meets60 ? 'yes' : 'no'} |`);
}
process.exit(0);
