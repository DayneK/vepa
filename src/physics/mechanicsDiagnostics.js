import { getPairGeometry } from './pairGeometry.js';
import { STRIDE_INDEXES as S } from '../constants.js';
import {
  applyContact, applyMomentum, applyTorque, applyConstraint, applyFragmentation, applyAdhesion,
  diagnoseCollisionImpulse, diagnoseWrapBoundary, diagnoseTopology,
} from './lawgroups/mechanicsLaws.js';

const massOf = (view, base) => Math.max(0.001, Number.isFinite(view[base + S.MASS]) ? view[base + S.MASS] : 0.001);
const momentumOf = (view, iBase, jBase) => {
  const mi = massOf(view, iBase), mj = massOf(view, jBase);
  return {
    x: mi * (view[iBase + S.VEL_X] || 0) + mj * (view[jBase + S.VEL_X] || 0),
    y: mi * (view[iBase + S.VEL_Y] || 0) + mj * (view[jBase + S.VEL_Y] || 0),
    z: mi * (view[iBase + S.VEL_Z] || 0) + mj * (view[jBase + S.VEL_Z] || 0),
  };
};

/**
 * Return source-level mechanics facts and each law's isolated contribution.
 * This is intentionally opt-in and does not mutate the particle buffer.
 */
export function inspectMechanicsPair(view, iBase, jBase, worldSize) {
  const geometry = getPairGeometry(view, iBase, jBase, worldSize);
  const snapshot = view.slice ? view.slice() : null;
  const contact = applyContact(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, geometry.distance, 1);
  const momentum = applyMomentum(view, iBase, jBase, 0.04);
  const torque = applyTorque(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, 0.01);
  const constraint = applyConstraint(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, geometry.distance, 0.03);
  const fragmentation = applyFragmentation(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, geometry.distance, 0.02);
  const adhesion = applyAdhesion(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, geometry.distance, 0.015);
  // ARP-6: COLL impulse along the i → j normal, particle i's WRAP boundary
  // decision (upstream v9.2.0 replaced mechanics INERTIA with WRAP at law 130),
  // TOPOLOGY imbalance, and pair momentum before/after the impulse
  // (applied as the solver does: Δv_i = J·m_j·n, Δv_j = −J·m_i·n).
  const collImpulse = diagnoseCollisionImpulse(view, iBase, jBase, geometry.normalX, geometry.normalY, geometry.normalZ, 0.5);
  const wrap = diagnoseWrapBoundary(
    { x: view[iBase + S.POS_X], y: view[iBase + S.POS_Y], z: view[iBase + S.POS_Z] },
    { x: view[iBase + S.VEL_X], y: view[iBase + S.VEL_Y], z: view[iBase + S.VEL_Z] },
    worldSize,
  );
  const topology = diagnoseTopology(view, iBase, jBase, geometry.dx, geometry.dy, geometry.dz, geometry.distance, 0.01);
  const momentumBefore = momentumOf(view, iBase, jBase);
  const mi = massOf(view, iBase), mj = massOf(view, jBase);
  const jScalar = collImpulse.approaching ? -(1 + collImpulse.restitution) * collImpulse.relativeVelocityAlongNormal / (mi + mj) : 0;
  const momentumAfter = {
    x: momentumBefore.x + mi * jScalar * mj * geometry.normalX - mj * jScalar * mi * geometry.normalX,
    y: momentumBefore.y + mi * jScalar * mj * geometry.normalY - mj * jScalar * mi * geometry.normalY,
    z: momentumBefore.z + mi * jScalar * mj * geometry.normalZ - mj * jScalar * mi * geometry.normalZ,
  };
  // Current helpers are expected to be pure; restore defensively if a future
  // diagnostic-only helper adds state mutation.
  if (snapshot && typeof view.set === 'function') view.set(snapshot);
  return {
    distance: geometry.distance,
    overlap: geometry.overlap,
    relativeSpeed: geometry.relativeSpeed,
    relativeVelocityAlongNormal: geometry.relativeVelocityAlongNormal,
    contactCorrection: contact,
    momentumCorrection: momentum,
    torqueContribution: torque,
    constraintCorrection: constraint,
    fragmentationThreshold: 2 + Math.min(8, (view[iBase + S.ARMOR] || 0) + (view[jBase + S.ARMOR] || 0)),
    fragmentationContribution: fragmentation,
    adhesionContribution: adhesion,
    collImpulse,
    wrap,
    topology,
    momentumBefore,
    momentumAfter,
  };
}
