#!/usr/bin/env node
// D-036: per-law cost by leave-one-out, for the multiplex LAW COUNT ranking.
//
// Runs the bench:solver world (seeded, TIDAL_BLOOM params) with EVERY law on,
// then once per law with just that law off, and reports how many ms/tick each
// law costs (all-laws median minus without-law median). Each run is a fresh
// child process; --reps repeats the whole sweep and the medians are used.
//
//   node bench/law-cost.mjs --count 1000 --ticks 15 --reps 2 > costs.json
//   node bench/law-cost.mjs --from costs.json --write   # regenerate src/multiplex/lawRanking.js
//
// The committed ranking is a fixed table (deterministic); rerunning on another
// machine gives a similar but not identical order for the cheap laws.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const SELF = fileURLToPath(import.meta.url);
const ROOT = new URL('..', import.meta.url);

if (argv[0] === '--child') {
  const [COUNT, TICKS, WARM, DROP] = [Number(argv[1]), Number(argv[2]), Number(argv[3]), argv[4]];
  let s = 0x9e3779b9 ^ COUNT;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  let m = 0x5bd1e995; Math.random = () => { m = (Math.imul(m, 1103515245) + 12345) >>> 0; return m / 4294967296; };
  const { PARTICLE_STRIDE, STRIDE_INDEXES: S, DNA_RANGES, LAW_INDEXES, WORLD_SIZE } = await import('../src/constants.js');
  const { createLawState, set: setLaw } = await import('../src/state/lawState.js');
  const { createDNABuffer, loadDefaults, setDNAFloat, getDNAFloat } = await import('../src/dna/dnaBuffer.js');
  const { solve, drainOffspring, resetOffspringRing, resetSolverState } = await import('../src/physics/solver.js');
  const { TIDAL_BLOOM } = await import('../src/state/defaultPresets.js');
  const { runtimeConfig } = await import('../src/state/runtimeConfig.js');
  const wp = await import('../src/state/worldParams.js');
  runtimeConfig.worldParams = { ...wp.createWorldParams(), ...(TIDAL_BLOOM.worldParams || {}) };
  const view = new Float32Array(COUNT * 2 * PARTICLE_STRIDE);
  const dna = createDNABuffer(); loadDefaults(dna, DNA_RANGES);
  for (let sp = 0; sp < 5; sp++) for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; setDNAFloat(dna, sp, d, r.min + rng() * (r.max - r.min), r.min, r.max); }
  for (let i = 0; i < COUNT; i++) {
    const b = i * PARTICLE_STRIDE, sp = i % 5;
    view[b + S.POS_X] = rng() * WORLD_SIZE; view[b + S.POS_Y] = rng() * WORLD_SIZE; view[b + S.POS_Z] = rng() * WORLD_SIZE;
    view[b + S.MASS] = 1 + rng(); view[b + S.SPECIES_ID] = sp; view[b + S.ENERGY] = 50 + rng() * 50; view[b + S.RADIUS] = 0.6 + rng() * 0.6;
    view[b + S.BOND_PARTNER_1] = -1; view[b + S.BOND_PARTNER_2] = -1; view[b + S.BOND_PARTNER_3] = -1; view[b + S.BOND_PARTNER_4] = -1;
    for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, sp, d, r.min, r.max); }
  }
  const laws = createLawState();
  for (const n of Object.keys(LAW_INDEXES)) if (n !== DROP) setLaw(laws, LAW_INDEXES[n]);
  resetOffspringRing(); resetSolverState(0);
  const step = () => { solve(view, COUNT, PARTICLE_STRIDE, laws, dna, WORLD_SIZE, 1 / 60, rng); drainOffspring(); };
  for (let t = 0; t < WARM; t++) step();
  const times = [];
  for (let t = 0; t < TICKS; t++) { const t0 = performance.now(); step(); times.push(performance.now() - t0); }
  times.sort((a, b) => a - b);
  process.stdout.write(JSON.stringify({ drop: DROP, medMs: times[times.length >> 1] }) + '\n');
  process.exit(0);
}

const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const { LAW_INDEXES } = await import('../src/constants.js');
let rows;
if (arg('--from', '')) {
  const raw = readFileSync(arg('--from'), 'utf8').trim();
  rows = raw.startsWith('[') || raw.startsWith('{') && raw.includes('"rows"') ? JSON.parse(raw).rows : raw.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
} else {
  const [count, ticks, warm, reps] = [arg('--count', '1000'), arg('--ticks', '15'), arg('--warm', '5'), Number(arg('--reps', '2'))];
  rows = [];
  for (let r = 0; r < reps; r++) {
    for (const drop of ['none', ...Object.keys(LAW_INDEXES)]) {
      const res = spawnSync(process.execPath, [SELF, '--child', count, ticks, warm, drop], { encoding: 'utf8' });
      if (res.status !== 0) { console.error(res.stderr); process.exit(1); }
      rows.push(JSON.parse(res.stdout.trim().split('\n').pop()));
    }
  }
}
const by = new Map();
for (const r of rows) { if (!by.has(r.drop)) by.set(r.drop, []); by.get(r.drop).push(r.medMs); }
const base = median(by.get('none'));
const costs = Object.keys(LAW_INDEXES).map((n) => ({ law: n, index: LAW_INDEXES[n], costMs: +(base - median(by.get(n) || [base])).toFixed(2) }));

if (argv.includes('--write')) {
  const { DEFAULT_LIGHT_LAWS } = await import('../src/multiplex/previewLaws.js');
  // Light set first, life/energy/reproduction leading so tiny counts still
  // live; then every other law from cheapest to most expensive (ties by index).
  const LEAD = ['LIFE', 'ENERGY', 'REPRO', 'GRAV', 'DRAG', 'COLL', 'ACCR', 'ENTR', 'HEAT', 'BUOYANCY', 'TIDE', 'FIELD', 'CONVECTION', 'LATENT_HEAT', 'EQUILIBRIUM', 'GLOW'];
  if ([...LEAD].sort().join() !== [...DEFAULT_LIGHT_LAWS].sort().join()) throw new Error('LEAD must be the light set');
  const rest = costs.filter((c) => !LEAD.includes(c.law)).sort((a, b) => a.costMs - b.costMs || a.index - b.index);
  const order = [...LEAD, ...rest.map((c) => c.law)];
  const costOf = Object.fromEntries(costs.map((c) => [c.law, c.costMs]));
  const lines = order.map((n, i) => `  '${n}', // ${i + 1}: ${costOf[n].toFixed(2)} ms/tick`);
  const src = `// GENERATED by bench/law-cost.mjs --write (D-036). Do not edit by hand.
// Multiplex LAW COUNT ranking: the first N laws of LAW_PRIORITY are the ones a
// full-tier preview keeps at LAW COUNT = N (each sim still only runs laws it
// has on). Order: the 16-law light set (life, energy and reproduction first),
// then the remaining laws from cheapest to most expensive, measured by
// leave-one-out on a ${'1,000'}-particle all-laws bench:solver world (all-laws
// median ${base.toFixed(1)} ms/tick; the comment is the ms/tick removing that law saved,
// noise ≈ ±2 ms, so the order among cheap laws is approximate but fixed).
import { LAW_INDEXES, LAW_COUNT } from '../constants.js';
import { lawMaskFor } from './previewLaws.js';

export const LAW_PRIORITY = Object.freeze([
${lines.join('\n')}
]);
export const LIGHT_LAW_COUNT = ${LEAD.length};

/** Clamp a LAW COUNT value to 1…LAW_COUNT (non-numbers → LAW_COUNT, i.e. all laws). */
export function sanitizeLawCount(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(1, Math.min(LAW_COUNT, n)) : LAW_COUNT;
}

/** Law mask of the top-N laws of LAW_PRIORITY. */
export function lawCountMask(n) {
  return lawMaskFor(LAW_PRIORITY.slice(0, sanitizeLawCount(n)));
}

if (LAW_PRIORITY.length !== LAW_COUNT || new Set(LAW_PRIORITY).size !== LAW_COUNT || LAW_PRIORITY.some((l) => LAW_INDEXES[l] === undefined)) {
  throw new Error('lawRanking: LAW_PRIORITY must list every law exactly once');
}
`;
  writeFileSync(new URL('src/multiplex/lawRanking.js', ROOT), src);
  console.error(`wrote src/multiplex/lawRanking.js (${order.length} laws)`);
}
console.log(JSON.stringify({ baseMs: +base.toFixed(2), costs: costs.sort((a, b) => b.costMs - a.costMs), rows }, null, 1));
