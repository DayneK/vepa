// ARP-6 (AC-20): mechanicsDiagnostics reports COLL impulse, INERTIA, TOPOLOGY
// and pair momentum before/after on a collision fixture, without mutating it.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S } from '../../src/constants.js';
import { inspectMechanicsPair } from '../../src/physics/mechanicsDiagnostics.js';

function fixture() {
  const view = new Float32Array(2 * PARTICLE_STRIDE);
  const set = (i, o) => { for (const [k, v] of Object.entries(o)) view[i * PARTICLE_STRIDE + S[k]] = v; };
  set(0, { POS_X: 10, POS_Y: 10, POS_Z: 10, VEL_X: 2, VEL_Y: 0.5, MASS: 2, RADIUS: 1, BOND_COUNT: 3 });
  set(1, { POS_X: 11.5, POS_Y: 10, POS_Z: 10, VEL_X: -1, VEL_Y: 0, MASS: 1, RADIUS: 1, BOND_COUNT: 1 });
  return view;
}

describe('mechanicsDiagnostics collision fields (ARP-6)', () => {
  it('reports collImpulse, inertia, topology and momentum before/after', () => {
    const view = fixture();
    const before = Array.from(view);
    const d = inspectMechanicsPair(view, 0, PARTICLE_STRIDE, 100);
    expect(Array.from(view)).toEqual(before); // read-only
    expect(d.collImpulse.approaching).toBe(true);
    expect(d.collImpulse.relativeVelocityAlongNormal).toBeCloseTo(3, 6);
    // J = −(1+e)·v_n/(m_i+m_j) = −1.5·3/3 = −1.5; impulse on i = J·m_j·n = (−1.5, 0, 0)
    expect(d.collImpulse.impulse.x).toBeCloseTo(-1.5, 6);
    expect(d.inertia.mass).toBe(2);
    expect(d.inertia.scale).toBeCloseTo(0.01, 9);
    expect(d.topology.bondImbalance).toBe(2);
    expect(d.momentumBefore.x).toBeCloseTo(3, 6); // 2·2 + 1·(−1)
    expect(d.momentumBefore.y).toBeCloseTo(1, 6);
    for (const k of ['x', 'y', 'z']) expect(d.momentumAfter[k]).toBeCloseTo(d.momentumBefore[k], 9); // conserved
  });
  it('a separating pair has zero impulse and unchanged momentum', () => {
    const view = fixture();
    view[S.VEL_X] = -2;
    const d = inspectMechanicsPair(view, 0, PARTICLE_STRIDE, 100);
    expect(d.collImpulse.approaching).toBe(false);
    expect(d.collImpulse.impulse.x).toBe(0);
    expect(d.momentumAfter).toEqual(d.momentumBefore);
  });
});
