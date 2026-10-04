// LRA-4 (AC-32): cycle classes beyond hard dependencies + runaway-scenario tests.
import { describe, it, expect } from 'vitest';
import { classifyLawCycles, findLawCycles } from '../../src/physics/lawGraph.js';
import { worldMetrics, assessBounded } from '../../src/physics/loopDiagnostics.js';
import { makeWorld, step, ALL_LAWS, PARTICLE_STRIDE, S } from '../helpers/lawWorld.js';

function runScenario(laws, ticks = 300, opts = {}) {
  const w = makeWorld({ n: 80, spread: 30, ...opts });
  const series = [];
  step(w, laws, ticks, { each: (wd) => series.push(worldMetrics(wd.view, wd.n, PARTICLE_STRIDE)) });
  return series;
}

describe('feedback cycle classes (LRA-4)', () => {
  const c = classifyLawCycles();
  it('reports hard, synergy, declared-feedback, resource and self-loop classes', () => {
    expect(Object.keys(c).sort()).toEqual(['declaredFeedback', 'hard', 'resource', 'selfLoop', 'synergy']);
    expect(c.hard).toEqual(findLawCycles());
    expect(c.synergy.length).toBeGreaterThan(0);
    expect(c.declaredFeedback.map((f) => f.law)).toEqual(expect.arrayContaining(['AUTOCATALYSIS', 'FEEDBACK', 'ENERGY', 'RADIATION']));
    expect(c.resource.length).toBeGreaterThan(0);
    expect(c.selfLoop).toContain('ENERGY');
  });
  it('resource loops are real two-way couplings over non-kinematic fields', () => {
    for (const r of c.resource) {
      expect(r.aToB.length).toBeGreaterThan(0);
      expect(r.bToA.length).toBeGreaterThan(0);
      for (const f of [...r.aToB, ...r.bToA]) expect(f).not.toMatch(/^(POS|VEL)_/);
    }
  });
});

describe('bounded-loop diagnostics', () => {
  it('flags non-finite state, speed and energy runaway (adversarial)', () => {
    const ok = { energy: 10, kinetic: 1, maxSpeed: 1, maxTemp: 1, finite: true };
    expect(assessBounded([ok, ok]).bounded).toBe(true);
    expect(assessBounded([ok, { ...ok, finite: false }]).reasons[0]).toMatch(/non-finite/);
    expect(assessBounded([ok, { ...ok, maxSpeed: 1e3 }]).reasons[0]).toMatch(/speed/);
    expect(assessBounded([ok, { ...ok, energy: 1e3 }]).reasons[0]).toMatch(/energy/);
  });
  it('worldMetrics sees a poisoned particle', () => {
    const w = makeWorld({ n: 4 });
    w.view[2 * PARTICLE_STRIDE + S.VEL_X] = NaN;
    expect(worldMetrics(w.view, w.n, PARTICLE_STRIDE).finite).toBe(false);
  });
});

describe('runaway scenarios stay bounded (300 ticks; all-laws 120 ticks)', () => {
  const cases = {
    'all 136 laws': ALL_LAWS,
    'positive-feedback chemistry (AUTOCATALYSIS, FEEDBACK, EXOTHERMIC, CATALYSIS, ENERGY, HEAT)': ['AUTOCATALYSIS', 'FEEDBACK', 'EXOTHERMIC', 'CATALYSIS_LAW', 'ENERGY', 'HEAT'],
    'thermal-EM loop (HEAT, EXOTHERMIC, PLASMA, DISCHARGE, IONIZATION, RESISTANCE, CURRENT, COLL)': ['HEAT', 'EXOTHERMIC', 'PLASMA', 'DISCHARGE', 'IONIZATION', 'RESISTANCE', 'CURRENT', 'COLL'],
    'dense gravitational collapse (GRAV, ACCR, COLL, CONTACT, SINGULARITY)': ['GRAV', 'ACCR', 'COLL', 'CONTACT', 'SINGULARITY'],
  };
  for (const [name, laws] of Object.entries(cases)) {
    it(name, () => {
      const series = laws === ALL_LAWS ? runScenario(laws, 120, { n: 50 }) : runScenario(laws);
      const verdict = assessBounded(series, { maxSpeed: 50, maxTemp: 1e4, maxEnergyGrowth: 10 });
      expect(verdict.reasons).toEqual([]);
      expect(verdict.bounded).toBe(true);
    }, 60000);
  }
});
