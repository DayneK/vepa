// LRA-4 (AC-32): bounded-loop diagnostics. Pure read-only metrics over a
// particle buffer plus a runaway assessment over a metric series. Used by
// tests and dev tooling; never called from the solver hot path.
import { STRIDE_INDEXES as S } from '../constants.js';

/** Snapshot of the quantities feedback loops can run away with. */
export function worldMetrics(view, n, stride) {
  let energy = 0, kinetic = 0, maxSpeed = 0, maxTemp = 0, finite = true;
  for (let i = 0; i < n; i++) {
    const b = i * stride;
    if (view[b + S.DEAD] > 0) continue;
    const vx = view[b + S.VEL_X], vy = view[b + S.VEL_Y], vz = view[b + S.VEL_Z];
    const m = view[b + S.MASS] || 0, e = view[b + S.ENERGY] || 0, t = view[b + S.TEMPERATURE] || 0;
    if (![vx, vy, vz, m, e, t].every(Number.isFinite)) { finite = false; continue; }
    const v2 = vx * vx + vy * vy + vz * vz;
    energy += e; kinetic += 0.5 * m * v2;
    maxSpeed = Math.max(maxSpeed, Math.sqrt(v2)); maxTemp = Math.max(maxTemp, Math.abs(t));
  }
  return { energy, kinetic, maxSpeed, maxTemp, finite };
}

/**
 * Assess a metric series for runaway behaviour.
 * @param {Array<ReturnType<typeof worldMetrics>>} series
 * @param {{maxSpeed?: number, maxTemp?: number, maxEnergyGrowth?: number, energyFloor?: number}} [limits]
 * @returns {{bounded: boolean, reasons: string[]}}
 */
export function assessBounded(series, { maxSpeed = 50, maxTemp = 1e4, maxEnergyGrowth = 10, energyFloor = 1 } = {}) {
  const reasons = [];
  if (!series.length) return { bounded: false, reasons: ['empty series'] };
  const e0 = Math.max(energyFloor, series[0].energy);
  series.forEach((m, t) => {
    if (!m.finite) reasons.push(`tick ${t}: non-finite state`);
    if (m.maxSpeed > maxSpeed) reasons.push(`tick ${t}: speed ${m.maxSpeed.toFixed(2)} > ${maxSpeed}`);
    if (m.maxTemp > maxTemp) reasons.push(`tick ${t}: temperature ${m.maxTemp.toFixed(1)} > ${maxTemp}`);
    if (m.energy > e0 * maxEnergyGrowth) reasons.push(`tick ${t}: energy ${m.energy.toFixed(1)} > ${maxEnergyGrowth}× start`);
  });
  return { bounded: reasons.length === 0, reasons: reasons.slice(0, 5) };
}
