import { describe, expect, it } from 'vitest';
import { STRIDE_INDEXES as S, PARTICLE_STRIDE } from '../../src/constants.js';
import {
  applyContact,
  applyContactCorrection,
  applyCollisionImpulse,
  diagnoseCollisionImpulse,
  diagnoseInertia,
  diagnoseTopology,
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

  it('provides non-mutating diagnostics for COLL, INERTIA, and TOPOLOGY', () => {
    const view = pair({ distance: 2, radius: 1, velocity: 2 });
    view[S.BOND_COUNT] = 4;
    view[PARTICLE_STRIDE + S.BOND_COUNT] = 1;
    const before = view.slice();

    const collision = diagnoseCollisionImpulse(view, 0, PARTICLE_STRIDE, 1, 0, 0, 0.5);
    const inertia = diagnoseInertia(view, 0, 4, -2, 1);
    const topology = diagnoseTopology(view, 0, PARTICLE_STRIDE, 1, 0, 0, 2);

    expect(collision.approaching).toBe(true);
    expect(collision.impulse.x).toBeLessThan(0);
    expect(inertia.scale).toBeCloseTo(0.02);
    expect(inertia.output.ax).toBeCloseTo(0.08);
    expect(topology.bondImbalance).toBe(3);
    expect(topology.correction.ax).toBeCloseTo(0.015);
    expect(view).toEqual(before);
    expect(Object.isFrozen(collision)).toBe(true);
    expect(Object.isFrozen(inertia)).toBe(true);
    expect(Object.isFrozen(topology)).toBe(true);
  });
});
