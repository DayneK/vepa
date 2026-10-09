// D-035: NaN-energy regression tests.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, DNA_RANGES, LAW_INDEXES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { applyGenotypeMutation, writeSomaticLocus } from '../../src/physics/laws.js';
import { setLawClockMs } from '../../src/physics/laws.js';
import { runSpeedWorld } from '../helpers/speedWorld.js';
import { SPEED_FAST_PRESET } from '../../src/state/worldParams.js';

function seq(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

describe('D-035 GENOTYPE keeps somatic DNA in range', () => {
  it('writeSomaticLocus clamps to DNA_RANGES and ignores non-finite values', () => {
    const view = new Float32Array(PARTICLE_STRIDE);
    const r = DNA_RANGES[40];
    view[S.DNA_CACHE_START + 40] = 0.95;
    writeSomaticLocus(view, 0, 40, -3); expect(view[S.DNA_CACHE_START + 40]).toBeCloseTo(r.min, 6);
    writeSomaticLocus(view, 0, 40, 9); expect(view[S.DNA_CACHE_START + 40]).toBeCloseTo(r.max, 6);
    writeSomaticLocus(view, 0, 40, NaN); expect(view[S.DNA_CACHE_START + 40]).toBeCloseTo(r.max, 6);
    writeSomaticLocus(view, 0, 40, Infinity); expect(view[S.DNA_CACHE_START + 40]).toBeCloseTo(r.max, 6);
  });

  it('thousands of high-rate, hot mutations never leave the declared ranges', () => {
    const laws = createLawState(); lawSet(laws, LAW_INDEXES.GENOTYPE);
    const view = new Float32Array(PARTICLE_STRIDE);
    for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d]; if (r) view[S.DNA_CACHE_START + d] = r.min; }
    view[S.DNA_CACHE_START + 12] = DNA_RANGES[12] ? DNA_RANGES[12].max : 1;
    view[S.TEMPERATURE] = 50;
    const prng = seq(3);
    for (let t = 0; t < 4000; t++) { setLawClockMs(t * 16); applyGenotypeMutation(laws, view, 0, 1, 1, prng, null); }
    for (let d = 0; d < 42; d++) {
      const v = view[S.DNA_CACHE_START + d], r = DNA_RANGES[d];
      expect(Number.isFinite(v)).toBe(true);
      if (r) { expect(v).toBeGreaterThanOrEqual(Math.fround(r.min) - 1e-6); expect(v).toBeLessThanOrEqual(Math.fround(r.max) + 1e-6); }
    }
  });
});

// Before D-035 each of these ended with 5–11 non-finite fields (NaN SIGNAL /
// ENERGY on live particles); see docs/GOLDEN-REBASELINE.md.
describe('D-035 seeded repro: 200 particles × 120 ticks', () => {
  for (const [label, params] of [['all speed sliders at defaults', {}], ['narrow mid range', { SPEED_MID_RANGE: 120 }], ['FAST', SPEED_FAST_PRESET]]) {
    it(`${label}: no particle ends with a non-finite field`, () => {
      const { view } = runSpeedWorld({ count: 200, ticks: 120, seed: 11, spread: 400, params });
      let bad = 0;
      for (let i = 0; i < view.length; i++) if (!Number.isFinite(view[i])) bad++;
      expect(bad).toBe(0);
    }, 60000);
  }
});

describe('D-035 MIND with coincident particles', () => {
  it('a same-species pair at distance 0 gives a finite signal boost', async () => {
    const { applyMind } = await import('../../src/physics/laws.js');
    const laws = createLawState(); lawSet(laws, LAW_INDEXES.MIND);
    const view = new Float32Array(PARTICLE_STRIDE * 2);
    view[S.SPECIES_ID] = 2; view[PARTICLE_STRIDE + S.SPECIES_ID] = 2;
    const e = applyMind(laws, view, 0, PARTICLE_STRIDE, 0, 1);
    expect(Number.isFinite(e.signalBoost)).toBe(true);
    expect(e.signalBoost).toBeCloseTo(1, 6); // 0.01 × 1 / 0.01
    // Unchanged away from 0: distance 10 → 0.001.
    expect(applyMind(laws, view, 0, PARTICLE_STRIDE, 100, 1).signalBoost).toBeCloseTo(0.001, 9);
  });
});

describe('D-035 final non-finite guard', () => {
  it('repairs NaN/Infinity ENERGY, SIGNAL, MEMORY and TEMPERATURE and counts them', async () => {
    const { solve, resetSolverState, getNonFiniteRepairCount } = await import('../../src/physics/solver.js');
    const { createDNABuffer } = await import('../../src/dna/dnaBuffer.js');
    resetSolverState(0);
    const view = new Float32Array(PARTICLE_STRIDE * 4);
    for (let i = 0; i < 2; i++) {
      const b = i * PARTICLE_STRIDE;
      view[b + S.POS_X] = 50 + i * 20; view[b + S.POS_Y] = 50; view[b + S.POS_Z] = 50;
      view[b + S.MASS] = 1; view[b + S.RADIUS] = 1; view[b + S.ENERGY] = 10;
      for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
    }
    view[S.ENERGY] = NaN; view[S.SIGNAL] = Infinity; view[S.MEMORY] = -Infinity; view[S.TEMPERATURE] = NaN;
    const laws = createLawState(); lawSet(laws, LAW_INDEXES.DRAG); // zero laws = hard freeze, so turn one on
    solve(view, 2, PARTICLE_STRIDE, laws, createDNABuffer(), 200, 1 / 60, seq(1));
    for (const k of ['ENERGY', 'SIGNAL', 'MEMORY', 'TEMPERATURE']) expect(view[S[k]]).toBe(0);
    expect(view[PARTICLE_STRIDE + S.ENERGY]).toBe(10);
    expect(getNonFiniteRepairCount()).toBe(4);
    resetSolverState(0);
    expect(getNonFiniteRepairCount()).toBe(0);
  });
});
