// DET-1 (AC-94): laws read a tick-based clock, never the wall clock.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { solve, resetOffspringRing, resetSolverClock, getSolverClock, LAW_CLOCK_MS_PER_TICK } from '../../src/physics/solver.js';
import { getLawClockMs, setLawClockMs, applyGenotypeMutation } from '../../src/physics/laws.js';
import { SplitMix32 } from '../../src/core/prng.js';

const N = 60;
// Fresh module instances per run: with every law on, the solver keeps
// module-level state between calls (fields, registries), so isolation needs
// a clean import rather than a reset.
async function runWorld(nowMs) {
  vi.resetModules();
  const { solve, resetOffspringRing, resetSolverClock } = await import('../../src/physics/solver.js');
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs());
  const g = new SplitMix32(99);
  const view = new Float32Array(N * 2 * PARTICLE_STRIDE);
  for (let i = 0; i < N; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = g.nextFloat(40, 160); view[b + S.POS_Y] = g.nextFloat(40, 160); view[b + S.POS_Z] = g.nextFloat(40, 160);
    view[b + S.MASS] = 1 + g.next(); view[b + S.ENERGY] = 70; view[b + S.RADIUS] = 0.8;
    view[b + S.TEMPERATURE] = 0.6; view[b + S.SPECIES_ID] = i % 3;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  }
  const laws = createLawState();
  // Every law, so each former performance.now() site is exercised.
  for (const idx of Object.values(LAW_INDEXES)) lawSet(laws, idx);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  resetOffspringRing();
  resetSolverClock();
  for (let t = 0; t < 12; t++) solve(view, N, PARTICLE_STRIDE, laws, dna, 200, 1 / 60, () => g.next());
  vi.restoreAllMocks();
  return Buffer.from(view.buffer).toString('base64');
}

afterEach(() => vi.restoreAllMocks());

describe('law clock (DET-1)', () => {
  it('laws.js has no wall-clock reads', () => {
    const src = readFileSync(new URL('../../src/physics/laws.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/performance\.now\(|Date\.now\(/);
  });

  it('the same world gives identical results whatever the wall clock reads', async () => {
    let fast = 0;
    const a = await runWorld(() => 0);
    const b = await runWorld(() => (fast += 7.3));
    const c = await runWorld(() => 1e9 + Math.floor(fast++));
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('the clock advances one tick per solve and resets', () => {
    resetSolverClock(5);
    expect(getSolverClock()).toBe(5);
    const view = new Float32Array(PARTICLE_STRIDE * 2);
    solve(view, 0, PARTICLE_STRIDE, createLawState(), createDNABuffer(), 200, 1 / 60, () => 0.5);
    expect(getLawClockMs()).toBe(5 * LAW_CLOCK_MS_PER_TICK);
    expect(getSolverClock()).toBe(6);
    resetSolverClock();
    expect(getSolverClock()).toBe(0);
  });

  it('GENOTYPE mutation draws depend on the law clock, not the wall clock', () => {
    const laws = createLawState();
    lawSet(laws, LAW_INDEXES.GENOTYPE);
    const dna = createDNABuffer();
    loadDefaults(dna, DNA_RANGES);
    const once = (clockMs, wall) => {
      vi.spyOn(performance, 'now').mockReturnValue(wall);
      setLawClockMs(clockMs);
      const view = new Float32Array(PARTICLE_STRIDE);
      for (let d = 0; d < 42; d++) view[S.DNA_CACHE_START + d] = 0.5;
      view[S.DNA_CACHE_START + 12] = 5; // high mutation rate
      view[S.TEMPERATURE] = 1;
      applyGenotypeMutation(laws, view, 0, 1, 1, null, null);
      vi.restoreAllMocks();
      return Array.from(view).join(',');
    };
    expect(once(1600, 0)).toBe(once(1600, 123456.789));
    expect(once(1600, 0)).not.toBe(once(3200, 0));
  });
});
