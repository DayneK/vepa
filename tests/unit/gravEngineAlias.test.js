// AUD-EXACT: 'reference' is the canonical name of the default per-pair CPU
// gravity solver; 'exact' is a permanent legacy alias that must behave the same.
import { describe, it, expect, afterEach } from 'vitest';
import { solve } from '../../src/physics/solver.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { LAW_INDEXES } from '../../src/constants.js';
import { runtimeConfig, normalizeGravEngine, GRAV_ENGINES } from '../../src/state/runtimeConfig.js';
import { SplitMix32 } from '../../src/core/prng.js';

const STRIDE = 100;
const WS = 200;
const initial = runtimeConfig.gravEngine;

function cloud(N, seed) {
  const rng = new SplitMix32(seed);
  const buf = new Float32Array(N * STRIDE);
  for (let i = 0; i < N; i++) {
    const b = i * STRIDE;
    buf[b] = rng.nextFloat(20, 180); buf[b + 1] = rng.nextFloat(20, 180); buf[b + 2] = rng.nextFloat(20, 180);
    buf[b + 6] = 1 + rng.nextFloat(0, 1); // mass
    buf[b + 7] = 0; // species
  }
  return buf;
}

function run(engine) {
  runtimeConfig.gravEngine = engine;
  const N = 300;
  const buf = cloud(N, 77);
  const law = createLawState();
  lawSet(law, LAW_INDEXES.GRAV);
  const prng = new SplitMix32(9);
  for (let t = 0; t < 3; t++) solve(buf, N, STRIDE, law, null, WS, 1, prng);
  return buf;
}

afterEach(() => { runtimeConfig.gravEngine = initial; });

describe('gravEngine naming (AUD-EXACT)', () => {
  it("defaults to 'reference'", () => {
    expect(initial).toBe('reference');
    expect(GRAV_ENGINES).toEqual(['reference', 'bh', 'fmm']);
  });
  it("normalises the legacy 'exact' alias and unknown values to 'reference'", () => {
    expect(normalizeGravEngine('exact')).toBe('reference');
    expect(normalizeGravEngine('reference')).toBe('reference');
    expect(normalizeGravEngine('bh')).toBe('bh');
    expect(normalizeGravEngine('fmm')).toBe('fmm');
    expect(normalizeGravEngine(undefined)).toBe('reference');
    expect(normalizeGravEngine('EXACT')).toBe('reference');
  });
  it("'exact' and 'reference' produce bit-identical solver output", () => {
    const a = run('exact');
    const b = run('reference');
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
  });
  it("'bh' differs from 'reference' (the alias is not a no-op switch)", () => {
    const a = run('reference');
    const b = run('bh');
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(false);
  });
});
