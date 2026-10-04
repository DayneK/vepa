/**
 * VEPA4 — Relationship laboratory, stage 2: features (MD-REL, AC-46).
 *
 * Pure: turns a window of recorder events into bounded features.
 *  - counts per type and their shares
 *  - cooperation = (kin + care + ally + trade) / all, conflict = rival / all
 *  - reciprocity = share of directed pairs (a→b) whose reverse (b→a) also occurs
 *  - concentration = share of events on the busiest node (0 = even, 1 = one hub)
 *  - rate = events per tick over the window
 */
const COOPERATIVE = new Set(['kin', 'care', 'ally', 'trade']);

export function extractRelationshipFeatures(events, { spanTicks = 1 } = {}) {
  const counts = {};
  const directed = new Set();
  const nodeLoad = new Map();
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    directed.add(`${e.a}>${e.b}`);
    nodeLoad.set(e.a, (nodeLoad.get(e.a) || 0) + 1);
    nodeLoad.set(e.b, (nodeLoad.get(e.b) || 0) + 1);
  }
  const total = events.length;
  let reciprocal = 0;
  for (const d of directed) { const [a, b] = d.split('>'); if (directed.has(`${b}>${a}`)) reciprocal++; }
  const coop = Object.entries(counts).reduce((s, [t, n]) => s + (COOPERATIVE.has(t) ? n : 0), 0);
  const busiest = nodeLoad.size ? Math.max(...nodeLoad.values()) : 0;
  return {
    total,
    counts,
    cooperation: total ? coop / total : 0,
    conflict: total ? (counts.rival || 0) / total : 0,
    kinShare: total ? (counts.kin || 0) / total : 0,
    reciprocity: directed.size ? reciprocal / directed.size : 0,
    concentration: total ? busiest / (2 * total) : 0,
    rate: total / Math.max(1, spanTicks),
    nodes: nodeLoad.size,
  };
}
