// ============================================================================
// VEPA4 — Information Law Group (INFO)
// Pairwise and per-particle law functions: Navigation, Encryption.
// Each function returns a force object {ax, ay, az} or null. State mutations
// are NaN-guarded and clamped before being written back to the buffer.
// ============================================================================

import { PARTICLE_STRIDE, STRIDE_INDEXES as S } from '../../constants.js';
import { clamp, nanGuard } from '../../core/numeric.js';
import { cipherKey } from '../cipherKey.js';

/**
 * Navigation — memory gradient steering.
 * If the neighbor's stored MEMORY exceeds this particle's, produce a force
 * toward the neighbor proportional to the memory difference, normalized by
 * distance.
 */
function applyNavigation(view, iBase, jBase, dx, dy, dz, dist, k) {
  const memI = view[iBase + S.MEMORY];
  const memJ = view[jBase + S.MEMORY];
  if (!(memJ > memI)) return null;
  const strength = (memJ - memI) * k;
  const invDist = 1 / dist;
  return {
    ax: nanGuard(dx * invDist * strength),
    ay: nanGuard(dy * invDist * strength),
    az: nanGuard(dz * invDist * strength),
  };
}

/**
 * Encryption — keyed cipher carrier (v4.6.29).
 * Scrambles the carrier: the particle's PHASE_2 is rotated by its cipher key
 * (folded from TUNING_CH1-4) and its SIGNAL amplitude is encoded by the key.
 * Decoding happens in the COMMS exchange (laws.js applySignalExchange), which
 * only relays intelligible signal between matching keys. Persistence is NOT
 * encryption — the old decay-floor behaviour is gone.
 */
function applyEncryption(view, iBase, k) {
  const signal = view[iBase + S.SIGNAL];
  if (!(signal > 0.01)) return null;
  const key = cipherKey(view, iBase);
  view[iBase + S.PHASE_2] = nanGuard((view[iBase + S.PHASE_2] || 0) + (key / 8) * k);
  const enc = signal * (0.6 + 0.4 * Math.sin((key / 8) * Math.PI * 2));
  view[iBase + S.SIGNAL] = clamp(nanGuard(enc), 0, 10);
  return null;
}

export { applyNavigation, applyEncryption };
