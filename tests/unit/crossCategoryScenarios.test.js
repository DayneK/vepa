// LRA-9 (AC-37): cross-category scenario contracts. Each scenario enables laws
// from at least two categories on the shared deterministic fixture and states a
// system-level contract (boundedness, conservation, direction of effect, or
// invariant) rather than a single-law unit behaviour.
import { describe, it, expect } from 'vitest';
import { LAW_CATEGORIES, LAW_INDEXES } from '../../src/constants.js';
import { makeWorld, step, field, sum, S, PARTICLE_STRIDE, ALL_LAWS } from '../helpers/lawWorld.js';
import { worldMetrics, assessBounded } from '../../src/physics/loopDiagnostics.js';
import { entanglementInvariantErrors, classifyQuantumState, illegalTransitions } from '../../src/physics/quantumStateMachine.js';

const init = (v, b, i, r) => { v[b + S.CHARGE] = (i % 2 ? 1 : -1) * r(); v[b + S.TEMPERATURE] = 20 + r() * 60; v[b + S.ENTANGLE_ID] = -1; };
const world = () => makeWorld({ n: 60, spread: 25, init });
const sd = (a) => { const mu = sum(a) / a.length; return Math.sqrt(sum(a.map((v) => (v - mu) ** 2)) / a.length); };
const metrics = (w) => worldMetrics(w.view, w.n, PARTICLE_STRIDE);
const series = (w, laws, ticks) => { const out = [metrics(w)]; step(w, laws, ticks, { each: (wd) => out.push(metrics(wd)) }); return out; };
const categoryOf = (law) => Object.entries(LAW_CATEGORIES).find(([, c]) => c.laws.includes(LAW_INDEXES[law]))[0];

const SCENARIOS = {
  'thermal→chemistry→EM': ['EXOTHERMIC', 'BOIL', 'PLASMA', 'CHARGE_LAW', 'ACIDITY'],
  'physics+mechanics': ['GRAV', 'COLL', 'CONTACT', 'BOND', 'MOMENTUM', 'DRAG'],
  'quantum+metaphysics': ['SUPERPOSITION', 'OBSERVER', 'ENTANGLEMENT', 'CHAOS', 'ORDER'],
  'EM+thermal': ['DISCHARGE', 'HEAT', 'EQUILIBRIUM', 'CONVECTION'],
  'biology+information': ['LIFE', 'ENERGY', 'REPRO', 'MEMORY', 'LEARN', 'CULTURE'],
};

describe('cross-category scenarios (LRA-9)', () => {
  it('every scenario spans at least two law categories', () => {
    for (const [name, laws] of Object.entries(SCENARIOS)) expect(new Set(laws.map(categoryOf)).size, name).toBeGreaterThanOrEqual(2);
  });

  it('thermal→chemistry→EM: heat drives ionisation, the cloud stays bounded and energy is conserved', () => {
    const w = world(); const q0 = field(w, 'CHARGE');
    const s = series(w, SCENARIOS['thermal→chemistry→EM'], 120);
    expect(assessBounded(s, { maxSpeed: 10.5 }).reasons).toEqual([]);
    expect(Math.abs(s.at(-1).energy - s[0].energy) / s[0].energy).toBeLessThan(0.01);
    const q = field(w, 'CHARGE');
    expect(q.reduce((d, x, i) => d + Math.abs(x - q0[i]), 0)).toBeGreaterThan(1);
  });

  it('physics+mechanics: gravity contracts the cloud while collisions keep speeds bounded', () => {
    const w = world(); const x0 = sd(field(w, 'POS_X'));
    const s = series(w, SCENARIOS['physics+mechanics'], 120);
    expect(sd(field(w, 'POS_X'))).toBeLessThan(x0);
    expect(assessBounded(s, { maxSpeed: 10 }).reasons).toEqual([]);
  });

  it('quantum+metaphysics: entanglement forms, links stay reciprocal and every quantum transition is legal', () => {
    const w = world();
    let prev = Array.from({ length: w.n }, (_, i) => classifyQuantumState(w.view, i * PARTICLE_STRIDE));
    const problems = [];
    step(w, SCENARIOS['quantum+metaphysics'], 120, {
      each: (wd) => {
        problems.push(...entanglementInvariantErrors(wd.view, wd.n, PARTICLE_STRIDE));
        for (let i = 0; i < wd.n; i++) { const c = classifyQuantumState(wd.view, i * PARTICLE_STRIDE); problems.push(...illegalTransitions(prev[i], c)); prev[i] = c; }
      },
    });
    expect(problems).toEqual([]);
    expect(field(w, 'ENTANGLE_ID').filter((v) => v >= 0).length).toBeGreaterThan(0);
  });

  it('EM+thermal: equilibrium wins over spark heating — temperature spread shrinks, energy conserved', () => {
    const w = world(); const t0 = sd(field(w, 'TEMPERATURE'));
    const s = series(w, SCENARIOS['EM+thermal'], 120);
    expect(sd(field(w, 'TEMPERATURE'))).toBeLessThan(t0 * 0.5);
    expect(Math.abs(s.at(-1).energy - s[0].energy)).toBeLessThan(1);
    expect(assessBounded(s).bounded).toBe(true);
  });

  it('biology+information: living particles accumulate memory without creating energy', () => {
    const w = world();
    const s = series(w, SCENARIOS['biology+information'], 120);
    expect(sum(field(w, 'MEMORY'))).toBeGreaterThan(0);
    expect(s.at(-1).energy).toBeLessThanOrEqual(s[0].energy * 1.01);
    expect(assessBounded(s).bounded).toBe(true);
  });

  it('all categories together: every law enabled stays finite and speed-capped', () => {
    const w = world();
    const s = series(w, ALL_LAWS, 120);
    expect(assessBounded(s, { maxSpeed: 10.5, maxEnergyGrowth: 2 }).reasons).toEqual([]);
  });
});
