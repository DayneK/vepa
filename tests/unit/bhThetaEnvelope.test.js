// BH-ENV (AC-22, D-008): population-scaled Barnes–Hut θ keeps rmsRelative ≤ 0.1
// at every scale 32–2048 on the bench:backends fixture; FMM stays opt-in.
import { describe, it, expect } from 'vitest';
import { compareBackends } from '../../bench/backend-compare.mjs';
import { bhThetaForPopulation } from '../../src/physics/octree.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';

describe('Barnes–Hut population-scaled θ (BH-ENV)', () => {
  it('θ is 0.7 up to 128 bodies, −0.1 per doubling, floored at 0.5', () => {
    expect(bhThetaForPopulation(32)).toBe(0.7);
    expect(bhThetaForPopulation(128)).toBe(0.7);
    expect(bhThetaForPopulation(256)).toBeCloseTo(0.6, 12);
    expect(bhThetaForPopulation(512)).toBeCloseTo(0.5, 12);
    expect(bhThetaForPopulation(100000)).toBe(0.5);
    // Callers take min(user θ, scaled θ): the default 0.5 is never changed.
    for (const n of [32, 512, 2048, 100000]) expect(Math.min(0.5, bhThetaForPopulation(n))).toBe(0.5);
  });
  for (const count of [32, 64, 128, 256, 512, 1024, 2048]) {
    it(`rmsRelative ≤ 0.1 at N = ${count}`, () => {
      const r = compareBackends({ count });
      expect(r.fixture.theta).toBe(bhThetaForPopulation(count));
      expect(r.candidates.octree.error.rmsRelative).toBeLessThanOrEqual(0.1);
    });
  }
  it('holds on two more seeds at the largest scale', () => {
    for (const seed of [12345, 0xabcdef]) expect(compareBackends({ count: 2048, seed }).candidates.octree.error.rmsRelative).toBeLessThanOrEqual(0.1);
  });
  it('FMM stays opt-in: the default gravity engine is the exact reference', () => {
    expect(runtimeConfig.gravEngine).toBe('reference');
  });
});
