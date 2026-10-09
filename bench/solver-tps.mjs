#!/usr/bin/env node
// VEPA4 — reproducible single-sim solver throughput bench (`npm run bench:solver`).
//
// Runs the CPU solver (the physics worker's code path) on a seeded TIDAL_BLOOM
// world, the boot preset, with its world params and WRAP seeded from TOROIDAL
// as main.js does. Each size runs in a fresh child process, several times, and
// the report gives the median ms/tick and ticks/s across runs. A SHA-256 of the
// final particle buffer is printed per size: a results-identical optimisation
// must leave it unchanged (it complements scripts/golden-parity.mjs at app-like
// sizes).
//
//   node bench/solver-tps.mjs                       # sizes 300,1000,2500,10000
//   node bench/solver-tps.mjs --sizes 1000 --runs 5 --ticks 40
//   node bench/solver-tps.mjs --json                # machine-readable
//   node bench/solver-tps.mjs --laws all            # every law on (stress)
//   node bench/solver-tps.mjs --speed SPEED_NEIGHBORS_48[,KEY…]|all   # D-034 speed options on
//   node bench/solver-tps.mjs --speed-matrix        # off, each speed option alone, all combined
// Each run also reports the alive particle count and alive species at the end
// (a quick read on how much a results-changing option alters the sim).
//
// Load matters: the report includes the 1-minute load average at start and end.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadavg, cpus } from 'node:os';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const SELF = fileURLToPath(import.meta.url);

if (argv[0] === '--child') {
  const COUNT = Number(argv[1]); const TICKS = Number(argv[2]); const WARM = Number(argv[3]); const LAWS = argv[4];
  const SPEED = argv[5] && argv[5] !== 'none' ? argv[5] : '';
  const SPECIES = 5;
  let s = 0x9e3779b9 ^ COUNT;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  let m = 0x5bd1e995; Math.random = () => { m = (Math.imul(m, 1103515245) + 12345) >>> 0; return m / 4294967296; };
  const { PARTICLE_STRIDE, STRIDE_INDEXES: S, DNA_RANGES, LAW_INDEXES, WORLD_SIZE } = await import('../src/constants.js');
  const { createLawState, set: setLaw } = await import('../src/state/lawState.js');
  const { createDNABuffer, loadDefaults, setDNAFloat, getDNAFloat } = await import('../src/dna/dnaBuffer.js');
  const { solve, drainOffspring, resetOffspringRing } = await import('../src/physics/solver.js');
  const { TIDAL_BLOOM } = await import('../src/state/defaultPresets.js');
  const { runtimeConfig } = await import('../src/state/runtimeConfig.js');
  const wp = await import('../src/state/worldParams.js');
  const WORLD = WORLD_SIZE;
  runtimeConfig.worldParams = { ...wp.createWorldParams(), ...(TIDAL_BLOOM.worldParams || {}) };
  if (SPEED) {
    const keys = SPEED === 'all' ? wp.SPEED_PARAM_KEYS : SPEED.split(',');
    for (const k of keys) {
      if (!wp.SPEED_PARAM_KEYS.includes(k)) { console.error(`unknown speed option ${k}`); process.exit(2); }
      runtimeConfig.worldParams[k] = 1;
    }
  }
  const view = new Float32Array(COUNT * 2 * PARTICLE_STRIDE);
  const dna = createDNABuffer(); loadDefaults(dna, DNA_RANGES);
  for (let sp = 0; sp < SPECIES; sp++) for (let d = 0; d < 42; d++) {
    const r = DNA_RANGES[d] || { min: -1, max: 1 };
    setDNAFloat(dna, sp, d, r.min + rng() * (r.max - r.min), r.min, r.max);
  }
  for (let i = 0; i < COUNT; i++) {
    const b = i * PARTICLE_STRIDE, sp = i % SPECIES;
    view[b + S.POS_X] = rng() * WORLD; view[b + S.POS_Y] = rng() * WORLD; view[b + S.POS_Z] = rng() * WORLD;
    view[b + S.MASS] = 1 + rng(); view[b + S.SPECIES_ID] = sp; view[b + S.ENERGY] = 50 + rng() * 50;
    view[b + S.RADIUS] = 0.6 + rng() * 0.6;
    view[b + S.BOND_PARTNER_1] = -1; view[b + S.BOND_PARTNER_2] = -1; view[b + S.BOND_PARTNER_3] = -1; view[b + S.BOND_PARTNER_4] = -1;
    for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, sp, d, r.min, r.max); }
  }
  const laws = createLawState();
  const names = LAWS === 'all' ? Object.keys(LAW_INDEXES) : TIDAL_BLOOM.laws;
  for (const n of names) if (LAW_INDEXES[n] !== undefined) setLaw(laws, LAW_INDEXES[n]);
  if (LAWS !== 'all' && wp.syncWrapLaw) wp.syncWrapLaw(runtimeConfig.worldParams, laws);
  resetOffspringRing();
  const h = createHash('sha256');
  let born = 0;
  const step = () => { solve(view, COUNT, PARTICLE_STRIDE, laws, dna, WORLD, 1 / 60, rng); for (const o of drainOffspring()) { born++; h.update(JSON.stringify(o)); } };
  for (let t = 0; t < WARM; t++) step();
  const times = [];
  for (let t = 0; t < TICKS; t++) { const t0 = performance.now(); step(); times.push(performance.now() - t0); }
  h.update(Buffer.from(view.buffer, 0, COUNT * PARTICLE_STRIDE * 4));
  times.sort((a, b) => a - b);
  let alive = 0, bonded = 0, energy = 0, nanEnergy = 0; const sp = new Set();
  for (let i = 0; i < COUNT * 2; i++) {
    const b = i * PARTICLE_STRIDE;
    if (view[b + S.DEAD] < 0.5 && view[b + S.MASS] > 0) { alive++; sp.add(view[b + S.SPECIES_ID]); const e = view[b + S.ENERGY]; if (Number.isFinite(e)) energy += e; else nanEnergy++; if (view[b + S.BOND_PARTNER_1] >= 0) bonded++; }
  }
  process.stdout.write(JSON.stringify({ medMs: times[times.length >> 1], hash: h.digest('hex').slice(0, 16), born, alive, species: sp.size, bonded, meanEnergy: +(energy / Math.max(1, alive - nanEnergy)).toFixed(2), nanEnergy }) + '\n');
  process.exit(0);
}

const sizes = (arg('--sizes', '300,1000,2500,10000')).split(',').map(Number);
const runs = Number(arg('--runs', '3'));
const lawsMode = arg('--laws', 'tidal');
const ticksFor = (n) => Number(arg('--ticks', n >= 10000 ? 12 : n >= 2500 ? 20 : 40));
const warm = Number(arg('--warm', 5));
const load0 = loadavg()[0];
const out = { node: process.version, cpus: cpus().length, laws: lawsMode, runs, load1Start: +load0.toFixed(2), sizes: {} };
const { SPEED_PARAM_KEYS } = await import('../src/state/worldParams.js');
const speedArg = arg('--speed', '');
const variants = argv.includes('--speed-matrix') ? ['none', ...SPEED_PARAM_KEYS, 'all'] : [speedArg || 'none'];
out.speed = variants.length === 1 ? variants[0] : variants;
const quiet = argv.includes('--json');
for (const variant of variants) {
  const sizesOut = {};
  if (variants.length > 1 && !quiet) console.log(`speed: ${variant}`);
  for (const n of sizes) {
    const meds = []; const hashes = new Set(); let last = null;
    for (let r = 0; r < runs; r++) {
      const res = spawnSync(process.execPath, [SELF, '--child', String(n), String(ticksFor(n)), String(warm), lawsMode, variant], { encoding: 'utf8', maxBuffer: 1 << 20 });
      if (res.status !== 0) { console.error(res.stderr); process.exit(1); }
      const j = JSON.parse(res.stdout.trim().split('\n').pop());
      meds.push(j.medMs); hashes.add(j.hash + '/' + j.born); last = j;
    }
    meds.sort((a, b) => a - b);
    const med = meds[meds.length >> 1];
    sizesOut[n] = { medMsPerTick: +med.toFixed(2), ticksPerSec: +(1000 / med).toFixed(2), runsMs: meds.map((v) => +v.toFixed(1)), hash: [...hashes].join(','), deterministic: hashes.size === 1, alive: last.alive, species: last.species, born: last.born, bonded: last.bonded, meanEnergy: last.meanEnergy, nanEnergy: last.nanEnergy };
    if (!quiet) console.log(`${String(n).padStart(6)} particles: ${sizesOut[n].ticksPerSec.toFixed(2).padStart(7)} ticks/s  (median ${med.toFixed(1)} ms/tick; runs ${sizesOut[n].runsMs.join(' / ')})  hash ${sizesOut[n].hash}  alive ${last.alive} species ${last.species}`);
  }
  if (variants.length === 1) out.sizes = sizesOut; else (out.variants ||= {})[variant] = sizesOut;
}
out.load1End = +loadavg()[0].toFixed(2);
if (argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
else console.log(`laws=${lawsMode} runs=${runs} node ${process.version} cpus ${out.cpus} load1 ${out.load1Start} → ${out.load1End}`);
