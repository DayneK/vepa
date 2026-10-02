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
