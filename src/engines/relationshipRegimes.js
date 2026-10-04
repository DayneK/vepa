/**
 * VEPA4 — Relationship laboratory, stage 3: regimes (MD-REL, AC-46).
 *
 * Classifies a feature window into one social regime. Rules are ordered and
 * explicit so every label can be explained from the features that produced it.
 */
export const RELATIONSHIP_REGIMES = Object.freeze(['quiet', 'kin-dominated', 'cooperative', 'conflictual', 'hub-and-spoke', 'mixed']);

export function classifyRelationshipRegime(f) {
  if (!f || f.total < 3) return { regime: 'quiet', reason: `only ${f ? f.total : 0} events` };
  if (f.conflict >= 0.4) return { regime: 'conflictual', reason: `rival share ${f.conflict.toFixed(2)} ≥ 0.40` };
  if (f.concentration >= 0.35 && f.nodes >= 4) return { regime: 'hub-and-spoke', reason: `busiest node carries ${(f.concentration * 100).toFixed(0)}% of endpoints` };
  if (f.kinShare >= 0.6) return { regime: 'kin-dominated', reason: `kin share ${f.kinShare.toFixed(2)} ≥ 0.60` };
  if (f.cooperation >= 0.7) return { regime: 'cooperative', reason: `cooperative share ${f.cooperation.toFixed(2)} ≥ 0.70` };
  return { regime: 'mixed', reason: 'no single pattern dominates' };
}
