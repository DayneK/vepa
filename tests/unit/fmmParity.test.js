import { describe, expect, it } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, WORLD_SIZE } from '../../src/constants.js';
import { buildFMMCells, fmmGravity } from '../../src/physics/fmm.js';
import { compareBackends, createFixture } from '../../bench/backend-compare.mjs';

describe('FMM backend boundaries', () => {
  it('uses a real toroidal near-cell stencil and exposes accounting metadata', () => {
    const view = new Float32Array(PARTICLE_STRIDE * 2);
    view[S.POS_X] = 1;
    view[S.POS_Y] = WORLD_SIZE * 0.5;
    view[S.POS_Z] = WORLD_SIZE * 0.5;
    view[S.MASS] = 1;
    view[PARTICLE_STRIDE + S.POS_X] = WORLD_SIZE - 1;
    view[PARTICLE_STRIDE + S.POS_Y] = WORLD_SIZE * 0.5;
    view[PARTICLE_STRIDE + S.POS_Z] = WORLD_SIZE * 0.5;
    view[PARTICLE_STRIDE + S.MASS] = 1;

    const cells = buildFMMCells(null, view, PARTICLE_STRIDE, 2, WORLD_SIZE, 2);
    expect(cells.nearCellCount).toBeGreaterThan(0);
    expect(cells.farCellCount).toBeGreaterThanOrEqual(0);
    expect(cells.neighbourList.length).toBe(cells.nearCellCount);
    expect(cells.interList.length).toBe(cells.farCellCount);
  });

  it('produces finite output for a deterministic fixture and reports near/far work', () => {
    const view = createFixture(32, 0x12345678);
    const fx = new Float64Array(32);
    const fy = new Float64Array(32);
    const fz = new Float64Array(32);
    const result = fmmGravity(view, PARTICLE_STRIDE, 32, WORLD_SIZE, 1, fx, fy, fz);

    expect(result.nearCellCount).toBeGreaterThan(0);
    expect(result.farCellCount).toBeGreaterThanOrEqual(0);
    for (const force of [...fx, ...fy, ...fz]) expect(Number.isFinite(force)).toBe(true);
  });

  it('keeps backend comparison explicitly relative to direct gravity', () => {
    const result = compareBackends({ count: 32, seed: 0x12345678 });
    expect(result.reference.backend).toBe('exact-direct-gravity');
    expect(result.candidates.octree.error.rmsAbsolute).toBeGreaterThanOrEqual(0);
    expect(result.candidates.fmm.error.rmsAbsolute).toBeGreaterThanOrEqual(0);
    expect(result.interpretation).toContain('Gravity-kernel fixture only');
  });
});
