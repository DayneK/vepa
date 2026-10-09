// PERF-7: the solver's lazy per-dimension pair compatibility must answer
// exactly what the full vector answers, for every dimension it evaluates,
// in any query order, including NaN / ±Infinity / -0 rows.
import { describe, it, expect } from 'vitest';
import {
  compatibilityForViewsInto, createCompatibilityScratch, meetsCompatibility,
  LAZY_PAIR_COMPAT_SUPPORTED, createLazyPairCompat, lazyPairSnapshot,
  lazyPhysical, lazyEnergetic, lazyGeometric, lazyResource, lazyBehavioral,
} from '../../src/physics/relationshipCompatibility.js';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S } from '../../src/constants.js';
import { SplitMix32 } from '../../src/core/prng.js';

const DIMS = { physical: lazyPhysical, energetic: lazyEnergetic, geometric: lazyGeometric, resource: lazyResource, behavioral: lazyBehavioral };

function fill(view, g, edge) {
  const specials = [NaN, Infinity, -Infinity, -0, 0, 1e30, -1e30, 1e-30, 1, -1];
  for (let i = 0; i < view.length; i++) {
    view[i] = edge && g.next() < 0.3 ? specials[(g.next() * specials.length) | 0] : (g.next() - 0.3) * (g.next() < 0.1 ? 400 : 3);
  }
}

describe('lazy pair compatibility (PERF-7)', () => {
  it('is enabled for the current DNA layout', () => {
    expect(LAZY_PAIR_COMPAT_SUPPORTED).toBe(true);
  });

  for (const edge of [false, true]) {
    it(`matches compatibilityForViewsInto bit-for-bit${edge ? ' on edge values' : ''}, in any order`, () => {
      const g = new SplitMix32(edge ? 99 : 4243);
      const N = 200;
      const view = new Float32Array(N * PARTICLE_STRIDE);
      fill(view, g, edge);
      for (let i = 0; i < N; i++) if (!edge || g.next() < 0.8) view[i * PARTICLE_STRIDE + S.SPECIES_ID] = i % 4;
      const ref = createCompatibilityScratch();
      const z = createLazyPairCompat();
      const names = Object.keys(DIMS);
      for (let k = 0; k < 3000; k++) {
        const a = (g.next() * N | 0) * PARTICLE_STRIDE, b = (g.next() * N | 0) * PARTICLE_STRIDE;
        compatibilityForViewsInto(view, a, b, {}, ref);
        z.flags = 0;
        lazyPairSnapshot(view, a, b, z);
        const start = (g.next() * names.length) | 0;
        for (let q = 0; q < names.length; q++) {
          const d = names[(start + q) % names.length];
          expect(Object.is(DIMS[d](z), ref.dimensions[d])).toBe(true);
          expect(Object.is(DIMS[d](z), ref.dimensions[d])).toBe(true); // cached answer
        }
        // threshold answers equal meetsCompatibility over the full vector
        for (const [dim, t] of [['physical', 0.2], ['geometric', 0.35], ['resource', 0.05], ['behavioral', 0.2], ['energetic', 0.1]]) {
          expect(!(DIMS[dim](z) < t)).toBe(meetsCompatibility(ref, { [dim]: t }));
        }
      }
    });
  }

  it('answers from the snapshot taken at the first query, not later row values', () => {
    const view = new Float32Array(2 * PARTICLE_STRIDE);
    fill(view, new SplitMix32(5), false);
    const ref = createCompatibilityScratch();
    compatibilityForViewsInto(view, 0, PARTICLE_STRIDE, {}, ref);
    const z = createLazyPairCompat();
    lazyPairSnapshot(view, 0, PARTICLE_STRIDE, z);
    view[S.ENERGY] += 123; view[S.RADIUS] += 3;
    lazyPairSnapshot(view, 0, PARTICLE_STRIDE, z); // no-op within the pair
    expect(lazyEnergetic(z)).toBe(ref.dimensions.energetic);
    expect(lazyGeometric(z)).toBe(ref.dimensions.geometric);
  });
});
