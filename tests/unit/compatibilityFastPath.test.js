// MX-20: the allocation-free compatibility path is bit-identical to the
// object path on random particle rows.
import { describe, it, expect } from 'vitest';
import { compatibilityForViews, compatibilityForViewsInto, createCompatibilityScratch } from '../../src/physics/relationshipCompatibility.js';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S } from '../../src/constants.js';
import { SplitMix32 } from '../../src/core/prng.js';

describe('compatibilityForViewsInto (MX-20)', () => {
  it('matches compatibilityForViews exactly on 2,000 random pairs', () => {
    const g = new SplitMix32(4242);
    const N = 400;
    const view = new Float32Array(N * PARTICLE_STRIDE);
    for (let i = 0; i < view.length; i++) view[i] = (g.next() - 0.3) * (g.next() < 0.1 ? 400 : 3);
    for (let i = 0; i < N; i++) view[i * PARTICLE_STRIDE + S.SPECIES_ID] = i % 4;
    const out = createCompatibilityScratch();
    for (let k = 0; k < 2000; k++) {
      const a = (g.next() * N | 0) * PARTICLE_STRIDE, b = (g.next() * N | 0) * PARTICLE_STRIDE;
      const world = k % 3 === 0 ? {} : { SPECIES_INTERACTION: g.next() * 4 - 2 };
      const ref = compatibilityForViews(view, a, b, world);
      const got = compatibilityForViewsInto(view, a, b, world, out);
      expect(got.overall).toBe(ref.overall);
      expect(got.sameSpecies).toBe(ref.sameSpecies);
      expect(got.speciesAffinity).toBe(ref.speciesAffinity);
      expect(got.interaction).toBe(ref.interaction);
      expect({ ...got.dimensions }).toEqual({ ...ref.dimensions });
      for (const d of Object.keys(ref.dimensions)) expect(Object.is(got.dimensions[d], ref.dimensions[d])).toBe(true);
    }
  });
});

// PERF-4: the inlined hot path must stay bit-identical on edge values too
// (NaN, ±Infinity, -0, huge and tiny magnitudes in every loci the path reads).
describe('compatibilityForViewsInto edge values (PERF-4)', () => {
  it('matches compatibilityForViews exactly when rows contain NaN, ±Infinity and -0', () => {
    const g = new SplitMix32(777);
    const N = 64;
    const view = new Float32Array(N * PARTICLE_STRIDE);
    const specials = [NaN, Infinity, -Infinity, -0, 0, 1e30, -1e30, 1e-30, 1, -1];
    for (let i = 0; i < view.length; i++) view[i] = g.next() < 0.3 ? specials[(g.next() * specials.length) | 0] : (g.next() - 0.5) * 50;
    const out = createCompatibilityScratch();
    for (let k = 0; k < 4000; k++) {
      const a = (g.next() * N | 0) * PARTICLE_STRIDE, b = (g.next() * N | 0) * PARTICLE_STRIDE;
      const world = k % 4 === 0 ? {} : { SPECIES_INTERACTION: k % 4 === 1 ? NaN : g.next() * 4 - 2 };
      const ref = compatibilityForViews(view, a, b, world);
      const got = compatibilityForViewsInto(view, a, b, world, out);
      expect(Object.is(got.overall, ref.overall)).toBe(true);
      expect(Object.is(got.speciesAffinity, ref.speciesAffinity)).toBe(true);
      for (const d of Object.keys(ref.dimensions)) expect(Object.is(got.dimensions[d], ref.dimensions[d]), d).toBe(true);
    }
  });
});
