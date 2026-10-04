// AUD-CONS (AC-40): measured conservation and non-redundancy matrices for every
// law. Each law runs alone on one deterministic fixture (fixed seeds, fresh
// solver context); the result is compared with a no-law baseline and with every
// other law. Consumed by scripts/generate-spec.mjs, so spec:check fails when a
// physics change alters what any law conserves or makes two laws identical.
import { PARTICLE_STRIDE as P, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES, LAW_CATEGORIES } from '../../src/constants.js';
import { LAW_RELATIONSHIPS } from '../../src/state/lawOntology.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults, getDNAFloat } from '../../src/dna/dnaBuffer.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext } from '../../src/physics/solver.js';

export const AUDIT_FIXTURE = Object.freeze({ particles: 36, ticks: 24, seed: 11, spread: 14, worldSize: 2000, dt: 1 / 60 });

const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

function fixture() {
  const { particles: n, seed, spread, worldSize } = AUDIT_FIXTURE;
  const view = new Float32Array(n * P);
  const r = lcg(seed); const c = worldSize / 2;
  const dna = createDNABuffer(); loadDefaults(dna, DNA_RANGES);
  for (let i = 0; i < n; i++) {
    const b = i * P;
    view[b + S.POS_X] = c + (r() - 0.5) * spread; view[b + S.POS_Y] = c + (r() - 0.5) * spread; view[b + S.POS_Z] = c + (r() - 0.5) * spread;
    view[b + S.VEL_X] = (r() - 0.5); view[b + S.VEL_Y] = (r() - 0.5); view[b + S.VEL_Z] = (r() - 0.5);
    view[b + S.MASS] = 0.5 + r(); view[b + S.ENERGY] = 30 + r() * 60; view[b + S.RADIUS] = 0.7;
    view[b + S.TEMPERATURE] = 10 + r() * 90; view[b + S.SPECIES_ID] = i % 3; view[b + S.CHARGE] = (i % 2 ? 1 : -1) * r();
    view[b + S.MEMORY] = r(); view[b + S.SIGNAL] = r() * 0.5; view[b + S.AGE] = 50 + r() * 600; view[b + S.ENTANGLE_ID] = -1;
    for (let k = 1; k <= 6; k++) if (S[`BOND_PARTNER_${k}`] !== undefined) view[b + S[`BOND_PARTNER_${k}`]] = -1;
    for (let d = 0; d < 42; d++) { const rg = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, i % 3, d, rg.min, rg.max); }
  }
  return { view, n, dna };
}

function run(lawNames) {
  const { view, n, dna } = fixture();
  const laws = createLawState();
  for (const name of lawNames) lawSet(laws, LAW_INDEXES[name]);
  const prev = enterSolverContext(createSolverContext());
  let born = 0;
  try {
    const prng = lcg(AUDIT_FIXTURE.seed + 1);
    for (let t = 0; t < AUDIT_FIXTURE.ticks; t++) {
      solve(view, n, P, laws, dna, AUDIT_FIXTURE.worldSize, AUDIT_FIXTURE.dt, prng);
      born += drainOffspring().length;
    }
  } finally { enterSolverContext(prev); }
  return { view, n, born };
}

function totals({ view, n, born }) {
  let energy = 0, mass = 0, charge = 0, px = 0, py = 0, pz = 0, alive = 0, finite = true;
  for (let i = 0; i < n; i++) {
    const b = i * P;
    const vals = [view[b + S.ENERGY], view[b + S.MASS], view[b + S.CHARGE], view[b + S.VEL_X], view[b + S.VEL_Y], view[b + S.VEL_Z]];
    if (!vals.every(Number.isFinite)) { finite = false; continue; }
    if (view[b + S.DEAD] >= 0.5) continue;
    alive += 1; energy += vals[0]; mass += vals[1]; charge += vals[2];
    px += vals[1] * vals[3]; py += vals[1] * vals[4]; pz += vals[1] * vals[5];
  }
  return { energy, mass, charge, momentum: [px, py, pz], alive, born, finite };
}

export const CONSERVED_QUANTITIES = Object.freeze(['energy', 'mass', 'charge', 'momentum', 'population']);
const DECLARED_FIELDS = { energy: ['ENERGY'], mass: ['MASS'], charge: ['CHARGE'] };
const REL = 1e-4;

const relDelta = (a, b, scale) => Math.abs(a - b) / Math.max(1, Math.abs(scale));
const cell = (d) => (d < REL ? 'kept' : 'changed');

/** Round for stable generated output (Float32 noise must not churn the spec). */
const r4 = (x) => Number(x.toPrecision(4));

export function computeLawAuditMatrices() {
  const names = Object.keys(LAW_INDEXES);
  const category = {};
  for (const [cat, rec] of Object.entries(LAW_CATEGORIES)) for (const idx of rec.laws) category[names.find((nm) => LAW_INDEXES[nm] === idx)] = cat;
  // Every law first runs alone. Laws whose final state is bit-identical to the
  // largest such group have no solo effect beyond the solver core (integration,
  // ageing) on this fixture — they need partner laws or conditions the fixture
  // lacks. That group's state is the core baseline for both matrices.
  const states = new Map(), results = new Map();
  for (const law of names) { const res = run([law]); states.set(law, res.view); results.set(law, res); }
  const key = (v) => { let h = 2166136261; const u = new Uint32Array(v.buffer, v.byteOffset, v.length); for (let k = 0; k < u.length; k++) h = Math.imul(h ^ u[k], 16777619) >>> 0; return h; };
  const groups = new Map();
  for (const law of names) { const k = key(states.get(law)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(law); }
  const coreGroup = [...groups.values()].sort((a, b) => b.length - a.length)[0];
  const coreOnly = new Set(coreGroup.length > 1 ? coreGroup : []);
  const base = coreGroup.length > 1 ? results.get(coreGroup[0]) : run([]);
  const t0 = totals(base);
  const conservation = names.map((law) => {
    const res = results.get(law);
    const t = totals(res);
    const dp = Math.hypot(...t.momentum.map((p, k) => p - t0.momentum[k]));
    const deltas = {
      energy: relDelta(t.energy, t0.energy, t0.energy),
      mass: relDelta(t.mass, t0.mass, t0.mass),
      charge: relDelta(t.charge, t0.charge, 1),
      momentum: dp / Math.max(1, t0.mass),
      population: Math.abs(t.alive + t.born - t0.alive - t0.born),
    };
    const writes = new Set((LAW_RELATIONSHIPS[law]?.writes || []).map((f) => String(f).split(/[\s/+]/)[0]));
    const cells = Object.fromEntries(CONSERVED_QUANTITIES.map((q) => [q, cell(deltas[q])]));
    const undeclared = ['energy', 'mass', 'charge'].filter((q) => cells[q] === 'changed' && !DECLARED_FIELDS[q].some((f) => writes.has(f)));
    return { law, category: category[law], cells, deltas: Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, r4(v)])), finite: t.finite, undeclared };
  });
  // Non-redundancy: L1 distance of every law's solo final state from the core
  // baseline and from its nearest other law; 0 to another law = indistinguishable.
  const dist = (a, b) => { let d = 0; for (let k = 0; k < a.length; k++) { const x = a[k] - b[k]; if (Number.isFinite(x)) d += Math.abs(x); } return d; };
  const redundancy = names.map((law) => {
    const v = states.get(law);
    const effect = dist(v, base.view);
    let nearest = null, nearestDist = Infinity;
    for (const other of names) {
      if (other === law || coreOnly.has(other)) continue;
      const d = dist(v, states.get(other));
      if (d < nearestDist) { nearestDist = d; nearest = other; }
    }
    const status = coreOnly.has(law) ? 'no-solo-effect' : nearestDist < 1e-6 ? 'indistinguishable' : 'distinct';
    return { law, category: category[law], effect: r4(effect), nearest, nearestDistance: r4(nearestDist), status };
  });
  return { fixture: AUDIT_FIXTURE, conservation, redundancy };
}
