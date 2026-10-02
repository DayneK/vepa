// RRP E9 (AC-92): world saves persist the PRNG seed and state, and a restore
// resumes the exact random sequence.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureWorldState, restoreWorldState, exportWorldSave, parseWorldSave, normalizeRng } from '../../src/state/worldSave.js';
import { SplitMix32 } from '../../src/core/prng.js';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { solve, resetOffspringRing } from '../../src/physics/solver.js';

const N = 64;
function world(prng) {
  const view = new Float32Array(N * 2 * PARTICLE_STRIDE);
  for (let i = 0; i < N; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = prng.nextFloat(20, 180);
    view[b + S.POS_Y] = prng.nextFloat(20, 180);
    view[b + S.POS_Z] = prng.nextFloat(20, 180);
    view[b + S.MASS] = 1 + prng.next();
    view[b + S.ENERGY] = 60;
    view[b + S.RADIUS] = 0.8;
    view[b + S.SPECIES_ID] = i % 3;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  }
  return view;
}

function run(view, laws, dna, prng, ticks) {
  resetOffspringRing();
  for (let t = 0; t < ticks; t++) solve(view, N, PARTICLE_STRIDE, laws, dna, 200, 1 / 60, () => prng.next());
  return Buffer.from(view.buffer).toString('base64');
}

afterEach(() => vi.restoreAllMocks());

describe('world save PRNG persistence (E9)', () => {
  it('SplitMix32 snapshot/fromSnapshot continues the same sequence', () => {
    const a = new SplitMix32(12345);
    for (let i = 0; i < 17; i++) a.next();
    const b = SplitMix32.fromSnapshot(a.snapshot());
    expect(b.seed).toBe(12345);
    for (let i = 0; i < 50; i++) expect(b.next()).toBe(a.next());
    expect(SplitMix32.fromSnapshot(null)).toBeNull();
  });

  it('two restores of one save produce identical PRNG draws and simulation hashes', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const prng = new SplitMix32(0xc0ffee);
    const view = world(prng);
    const laws = createLawState();
    lawSet(laws, LAW_INDEXES.GRAV);
    lawSet(laws, LAW_INDEXES.ENTR);
    const dna = createDNABuffer();
    loadDefaults(dna, DNA_RANGES);
    run(view, laws, dna, prng, 3);

    const save = parseWorldSave(exportWorldSave(captureWorldState({
      view, count: N, speciesCount: 3, dna, laws, tick: 3, rng: prng.snapshot(),
    })));
    expect(save.rng).toEqual(prng.snapshot());

    const results = [];
    for (let k = 0; k < 2; k++) {
      const v = new Float32Array(view.length);
      const l = createLawState();
      const d = createDNABuffer();
      const out = restoreWorldState(save, { view: v, dna: d, laws: l });
      const g = SplitMix32.fromSnapshot(out.rng);
      results.push(run(v, l, d, g, 10) + ':' + g.next());
    }
    expect(results[0]).toBe(results[1]);
    // and the restored run equals continuing the live world uninterrupted
    expect(results[0]).toBe(run(view, laws, dna, prng, 10) + ':' + prng.next());
  });

  it('saves without rng still load and report rng null', () => {
    const state = captureWorldState({ view: new Float32Array(PARTICLE_STRIDE), count: 1 });
    expect(state.rng).toBeNull();
    const out = restoreWorldState(parseWorldSave(exportWorldSave(state)), {});
    expect(out.rng).toBeNull();
    expect(normalizeRng({ state: -1 })).toEqual({ seed: 4294967295, state: 4294967295 });
  });
});
