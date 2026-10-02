// ============================================================================
// Preview law sets for Chaos Multiplex sims (MX-20, D-016 option B).
//
// 'full'  — each sim solves with its own law set (as before).
// 'light' — each sim solves with (its own laws) ∩ (the light set). Laws the sim
//           has off stay off; the sim's real law set is untouched, so the
//           fitness report, export and copy-to-world still see every law.
//
// The default light set keeps the physical and thermal motion, life, growth
// and reproduction that make previews readable, and drops the most expensive
// pairwise social/information/chemistry laws. It was picked by ablation on a
// 1,000-particle TIDAL_BLOOM world; see docs/MULTIPLEX-PERF.md. Users can edit
// it (multiplex config `lightLaws`), and it is persisted with the settings.
// ============================================================================
import { LAW_INDEXES } from '../constants.js';
import { createLawState } from '../state/lawState.js';

export const DEFAULT_LIGHT_LAWS = Object.freeze([
  'GRAV', 'DRAG', 'ENTR', 'BUOYANCY', 'COLL', 'ACCR', 'TIDE', 'FIELD',
  'HEAT', 'CONVECTION', 'LATENT_HEAT', 'EQUILIBRIUM', 'GLOW',
  'LIFE', 'ENERGY', 'REPRO',
]);

/** Keep only names that are real laws (deduplicated, original order). */
export function sanitizeLawNames(names) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(names) ? names : String(names || '').split(/[\s,]+/)) {
    const n = String(raw || '').trim().toUpperCase();
    if (!n || seen.has(n) || LAW_INDEXES[n] === undefined) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Build a five-word bit mask for a list of law names. */
export function lawMaskFor(names) {
  const mask = createLawState();
  for (const n of sanitizeLawNames(names)) {
    const i = LAW_INDEXES[n];
    const w = i < 32 ? mask.lowFlags : i < 64 ? mask.highFlags : i < 96 ? mask.extFlags : i < 128 ? mask.quadFlags : mask.pentaFlags;
    w[0] |= (1 << (i % 32));
  }
  return mask;
}

/** out = laws ∩ mask (all five words). Returns out. */
export function applyLawMask(laws, mask, out) {
  out.lowFlags[0] = laws.lowFlags[0] & mask.lowFlags[0];
  out.highFlags[0] = laws.highFlags[0] & mask.highFlags[0];
  out.extFlags[0] = (laws.extFlags ? laws.extFlags[0] : 0) & mask.extFlags[0];
  out.quadFlags[0] = (laws.quadFlags ? laws.quadFlags[0] : 0) & mask.quadFlags[0];
  out.pentaFlags[0] = (laws.pentaFlags ? laws.pentaFlags[0] : 0) & mask.pentaFlags[0];
  return out;
}
