import { describe, expect, it } from 'vitest';
import { STRIDE_INDEXES as S, PARTICLE_STRIDE } from '../../src/constants.js';
import {
  applyContact,
  applyContactCorrection,
  applyCollisionImpulse,
} from '../../src/physics/lawgroups/mechanicsLaws.js';

function pair({ distance = 1, radius = 1, velocity = 1 } = {}) {
  const view = new Float32Array(PARTICLE_STRIDE * 2);
  view[S.POS_X] = 0;
  view[PARTICLE_STRIDE + S.POS_X] = distance;
  view[S.MASS] = 1;
  view[PARTICLE_STRIDE + S.MASS] = 1;
  view[S.RADIUS] = radius;
  view[PARTICLE_STRIDE + S.RADIUS] = radius;
  view[S.VEL_X] = velocity;
  return view;
}

describe('physics/mechanics boundary', () => {
  it('exposes contact as positional correction, not impact response', () => {
    const view = pair({ distance: 1, radius: 1 });
    const correction = applyContactCorrection(view, 0, PARTICLE_STRIDE, 1, 0, 0, 1, 2);
    expect(correction).toMatchObject({ x: -0.5, y: -0, z: -0 });
    expect(applyContact(view, 0, PARTICLE_STRIDE, 1, 0, 0, 1)).toMatchObject({ ax: -0.5 });
    expect(view[S.VEL_X]).toBe(1);
  });

  it('applies COLL only when bodies approach along the contact normal', () => {
    const view = pair({ distance: 2, radius: 1, velocity: 1 });
    const impulse = applyCollisionImpulse(view, 0, PARTICLE_STRIDE, 1, 0, 0, 0.5);
    expect(impulse.ax).toBeLessThan(0);

    view[S.VEL_X] = -1;
    expect(applyCollisionImpulse(view, 0, PARTICLE_STRIDE, 1, 0, 0, 0.5)).toBeNull();
  });

  it('keeps impulse magnitude mass-weighted and bounded by restitution', () => {
    const view = pair({ distance: 2, radius: 1, velocity: 2 });
    view[PARTICLE_STRIDE + S.MASS] = 3;
    const impulse = applyCollisionImpulse(view, 0, PARTICLE_STRIDE, 1, 0, 0, 1);
    expect(impulse.ax).toBeCloseTo(-3);
    expect(impulse.ay).toBeCloseTo(0);
    expect(impulse.az).toBeCloseTo(0);
  });
});
