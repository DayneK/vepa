// FIELD-ONCE (AC-96, D-016): the field medium advances exactly once per solve.
import { describe, it, expect, afterEach } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer } from '../../src/dna/dnaBuffer.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import { createWorldParams } from '../../src/state/worldParams.js';
import { solve, resetSolverClock } from '../../src/physics/solver.js';
import { ensureFields, resetFields, advanceFields, getFields } from '../../src/physics/fields.js';

const saved = { wp: runtimeConfig.worldParams, once: runtimeConfig.fieldAdvanceOnce };
afterEach(() => { runtimeConfig.worldParams = saved.wp; runtimeConfig.fieldAdvanceOnce = saved.once; resetFields(); });

function thermalAfterSolve(once, n) {
  const wp = { ...createWorldParams(), FIELD_THERMAL: 0.8, FIELD_INFO: 0.5 };
  runtimeConfig.worldParams = wp;
  runtimeConfig.fieldAdvanceOnce = once;
  resetFields();
  resetSolverClock();
  const view = new Float32Array(n * 2 * PARTICLE_STRIDE);
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 100 + i; view[b + S.POS_Y] = 100; view[b + S.POS_Z] = 100;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 50; view[b + S.RADIUS] = 0.5;
  }
  const laws = createLawState();
  lawSet(laws, LAW_INDEXES.DRAG);
  solve(view, n, PARTICLE_STRIDE, laws, createDNABuffer(), 2000, 1 / 60, () => 0.5);
  return Array.from(getFields().scalars.THERMAL);
}

describe('FIELD-ONCE', () => {
  it('one solve advances the medium exactly once, whatever the population', () => {
    const wp = { ...createWorldParams(), FIELD_THERMAL: 0.8, FIELD_INFO: 0.5 };
    resetFields();
    const ref = ensureFields(2000, wp);
    advanceFields(ref, 1 / 60, wp);
    const expected = Array.from(ref.scalars.THERMAL);
    expect(thermalAfterSolve(true, 5)).toEqual(expected);
    expect(thermalAfterSolve(true, 40)).toEqual(expected);
  });

  it('legacy mode advances once per particle (kept for comparison)', () => {
    expect(thermalAfterSolve(false, 40)).not.toEqual(thermalAfterSolve(true, 40));
  });
});
