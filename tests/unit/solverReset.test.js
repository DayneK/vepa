// HIDDEN-STATE follow-up: world restart resets the main world's solver state
// (fields, HISTORY, clocks), so a restarted world matches a pristine one.
import { describe, it, expect, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext, resetSolverState, getSolverClock } from '../../src/physics/solver.js';

function run(ticks) {
  const n = 120, view = new Float32Array(n * PARTICLE_STRIDE);
  let s = 5;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 900 + r() * 200; view[b + S.POS_Y] = 900 + r() * 200; view[b + S.POS_Z] = 900 + r() * 200;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 70; view[b + S.RADIUS] = 0.7; view[b + S.SPECIES_ID] = i % 3;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  }
  const laws = createLawState();
  for (const name of Object.keys(LAW_INDEXES)) lawSet(laws, LAW_INDEXES[name]);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  let p = 9;
  for (let t = 0; t < ticks; t++) {
    solve(view, n, PARTICLE_STRIDE, laws, dna, 2000, 1 / 60, () => ((p = (p * 1664525 + 1013904223) >>> 0) / 4294967296));
    drainOffspring();
  }
  return createHash('sha256').update(Buffer.from(view.buffer)).digest('hex');
}

let prev = null;
afterEach(() => { if (prev) enterSolverContext(prev); prev = null; });

describe('resetSolverState (world restart)', () => {
  it('a restarted world matches a pristine one; without the reset it does not', () => {
    prev = enterSolverContext(createSolverContext());
    const pristine = run(5);
    run(7); // dirty the field medium / HISTORY / clocks
    const stale = run(5);
    resetSolverState();
    expect(getSolverClock()).toBe(0);
    const restarted = run(5);
    expect(restarted).toBe(pristine);
    expect(stale).not.toBe(pristine);
  });
});

describe('resetSolverState(tick) (world-save restore, D-023)', () => {
  it('restoring a save clears stale solver state and resumes the saved tick', () => {
    prev = enterSolverContext(createSolverContext());
    resetSolverState(42);
    const fromSave = run(5);
    run(9); // dirty the solver state after the save was taken
    resetSolverState(42);
    expect(getSolverClock()).toBe(42);
    expect(run(5)).toBe(fromSave);
  });

  it('main.js restore path uses resetSolverState with the saved tick', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
    const restore = src.slice(src.indexOf('const applyWorldRestore'), src.indexOf("bus.on('sim:chaos'"));
    expect(restore).toContain('resetSolverState(state.tick || 0)');
  });
});
