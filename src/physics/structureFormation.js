// LRA-6 (AC-34): structure formation contract BOND → CONSTRAINT → TOPOLOGY.
//
// BOND creates persistent links (BOND_COUNT + partner slots). CONSTRAINT acts
// only on bonded pairs (isBondedPair) and restores the link distance.
// TOPOLOGY reads the bond graph (BOND_COUNT difference) and applies a
// structural correction. The solver evaluates them in this order within the
// pair loop. Descriptive contract + read-only inspection; the solver does not
// consume this module.
import { STRIDE_INDEXES as S } from '../constants.js';

export const STRUCTURE_PIPELINE = Object.freeze([
  Object.freeze({ law: 'BOND', consumes: Object.freeze(['proximity', 'STIFFNESS']), produces: Object.freeze(['BOND_COUNT', 'BOND_PARTNER_1-6']) }),
  Object.freeze({ law: 'CONSTRAINT', consumes: Object.freeze(['bonded pair (BOND_PARTNER_1-6)']), produces: Object.freeze(['link-distance restoring force']) }),
  Object.freeze({ law: 'TOPOLOGY', consumes: Object.freeze(['BOND_COUNT']), produces: Object.freeze(['bond-graph structural correction']) }),
]);

const PARTNER_SLOTS = [1, 2, 3, 4, 5, 6].map((k) => S[`BOND_PARTNER_${k}`]).filter((x) => x !== undefined);

/** Snapshot of the bond graph hand-off (what CONSTRAINT and TOPOLOGY consume). */
export function inspectBondGraph(view, n, stride) {
  let totalBondCount = 0;
  const edges = new Set();
  for (let i = 0; i < n; i++) {
    const b = i * stride;
    totalBondCount += view[b + S.BOND_COUNT] || 0;
    for (const slot of PARTNER_SLOTS) {
      const j = view[b + slot];
      if (j >= 0 && j < n && j !== i && (view[b + S.BOND_COUNT] || 0) >= 1) edges.add(i < j ? `${i}-${j}` : `${j}-${i}`);
    }
  }
  return { totalBondCount, bondedPairs: edges.size, edges: [...edges].sort() };
}

/** Line positions of the three gates in solver source (ordering contract). */
export function solverStageOrder(solverSource) {
  const at = (re) => { const m = re.exec(solverSource); return m ? m.index : -1; };
  return {
    BOND: at(/active\[LAW_INDEXES\.BOND\]\s*&&\s*meetsCompatibility\(pairCompat\(view, iBase, jBase\), REQ_STRUCTURAL\)/),
    CONSTRAINT: at(/active\[LAW_INDEXES\.CONSTRAINT\]\s*&&\s*isBondedPair\(/),
    TOPOLOGY: at(/if \(active\[LAW_INDEXES\.TOPOLOGY\]\)/),
  };
}
