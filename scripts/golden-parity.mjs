#!/usr/bin/env node
// Golden-parity fixture (AC-88 / first half of DP-P2a).
//
// Runs the reference CPU solver on fixed, seeded worlds and hashes the final
// particle buffer (plus any offspring emitted) with SHA-256. Refactors must
// keep every hash identical unless an ACTIVE decision authorises a behaviour
// change, in which case regenerate with --update in the same commit and cite
// the decision.
//
//   node scripts/golden-parity.mjs            print hashes
//   node scripts/golden-parity.mjs --check    compare with tests/fixtures/golden-parity.json
//   node scripts/golden-parity.mjs --update   rewrite the fixture
//
// Determinism: the laws' time hash now reads the solver's tick clock (DET-1:
// tick × 16 ms, reset per scenario). The harness still stubs performance.now
// with the same t × 16 ms values it used before DET-1, so the fixture proves
// the tick clock reproduces the old stubbed behaviour exactly, and seeds
// Math.random for the few laws that fall back to it without a PRNG.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../tests/fixtures/golden-parity.json', import.meta.url));
const SEED = 20261003;
const COUNT = 400;
const SPECIES = 5;
const TICKS = 30;
const WORLD = 200;
const DT = 1 / 60;

function splitmix(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 4294967296;
  };
}

let clockMs = 0;
performance.now = () => clockMs;
const mathRng = splitmix(SEED ^ 0x5bd1e995);
Math.random = () => mathRng();

const { PARTICLE_STRIDE, STRIDE_INDEXES: S, DNA_RANGES, LAW_INDEXES, LAW_CATEGORIES } = await import('../src/constants.js');
const { createLawState, set: setLaw } = await import('../src/state/lawState.js');
const { createDNABuffer, loadDefaults, setDNAFloat, getDNAFloat } = await import('../src/dna/dnaBuffer.js');
const { solve, drainOffspring, resetOffspringRing, resetSolverClock } = await import('../src/physics/solver.js');
const { TIDAL_BLOOM } = await import('../src/state/defaultPresets.js');
const { runtimeConfig } = await import('../src/state/runtimeConfig.js');

function makeWorld(seed) {
  const rng = splitmix(seed);
  const view = new Float32Array(Math.max(COUNT * 2, 1024) * PARTICLE_STRIDE);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  for (let s = 0; s < SPECIES; s++) {
    for (let d = 0; d < 42; d++) {
      const r = DNA_RANGES[d] || { min: -1, max: 1 };
      setDNAFloat(dna, s, d, r.min + rng() * (r.max - r.min), r.min, r.max);
    }
  }
  for (let i = 0; i < COUNT; i++) {
    const b = i * PARTICLE_STRIDE;
    const s = i % SPECIES;
    view[b + S.POS_X] = rng() * WORLD;
    view[b + S.POS_Y] = rng() * WORLD;
    view[b + S.POS_Z] = rng() * WORLD;
    view[b + S.MASS] = 1 + rng();
    view[b + S.SPECIES_ID] = s;
    view[b + S.ENERGY] = 50 + rng() * 50;
    view[b + S.RADIUS] = 0.6 + rng() * 0.6;
    view[b + S.BOND_PARTNER_1] = -1; view[b + S.BOND_PARTNER_2] = -1;
    view[b + S.BOND_PARTNER_3] = -1; view[b + S.BOND_PARTNER_4] = -1;
    for (let d = 0; d < 42; d++) {
      const r = DNA_RANGES[d] || { min: -1, max: 1 };
      view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, s, d, r.min, r.max);
    }
  }
  return { view, dna };
}

function lawsFor(names) {
  const st = createLawState();
  for (const n of names) {
    if (LAW_INDEXES[n] === undefined) throw new Error(`unknown law ${n}`);
    setLaw(st, LAW_INDEXES[n]);
  }
  return st;
}

const NAME_BY_INDEX = Object.fromEntries(Object.entries(LAW_INDEXES).map(([k, v]) => [v, k]));
const scenarios = [
  ['none', []],
  ['default-tidal-bloom', TIDAL_BLOOM.laws],
  ['all-laws', Object.keys(LAW_INDEXES)],
  ...Object.entries(LAW_CATEGORIES).map(([cat, c]) => [`category-${cat}`, c.laws.map((i) => NAME_BY_INDEX[i])]),
];

function run(names, idx) {
  runtimeConfig.gravEngine = 'reference';
  resetOffspringRing();
  resetSolverClock();
  clockMs = 0;
  const world = makeWorld(SEED + idx);
  const laws = lawsFor(names);
  const prng = splitmix(SEED * 31 + idx);
  const h = createHash('sha256');
  let born = 0;
  for (let t = 0; t < TICKS; t++) {
    clockMs = t * 16;
    solve(world.view, COUNT, PARTICLE_STRIDE, laws, world.dna, WORLD, DT, prng);
    for (const o of drainOffspring()) { born++; h.update(JSON.stringify(o)); }
  }
  h.update(Buffer.from(world.view.buffer, 0, COUNT * PARTICLE_STRIDE * 4));
  return { sha256: h.digest('hex'), offspring: born };
}

const result = { schema: 'golden-parity/v1', seed: SEED, count: COUNT, ticks: TICKS, worldSize: WORLD, scenarios: {} };
scenarios.forEach(([name, laws], i) => { result.scenarios[name] = run(laws, i); });
// Self-check: the default scenario must reproduce inside one process too.
const again = run(scenarios[1][1], 1);
if (again.sha256 !== result.scenarios[scenarios[1][0]].sha256) {
  console.error('golden-parity: default scenario is not reproducible within one process (hidden solver state)');
  process.exit(2);
}

const mode = process.argv.includes('--update') ? 'update' : process.argv.includes('--check') ? 'check' : 'print';
if (mode === 'update') {
  writeFileSync(FIXTURE, JSON.stringify(result, null, 2) + '\n');
  console.log(`golden-parity: fixture written (${Object.keys(result.scenarios).length} scenarios)`);
} else if (mode === 'check') {
  const expected = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const diffs = Object.keys({ ...expected.scenarios, ...result.scenarios })
    .filter((k) => expected.scenarios[k]?.sha256 !== result.scenarios[k]?.sha256);
  if (diffs.length) {
    console.error(`golden-parity: MISMATCH in ${diffs.length} scenario(s): ${diffs.join(', ')}`);
    process.exit(1);
  }
  console.log(`golden-parity: OK (${Object.keys(result.scenarios).length} scenarios identical)`);
} else {
  console.log(JSON.stringify(result, null, 2));
}
