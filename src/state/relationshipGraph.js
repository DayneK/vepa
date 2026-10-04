/**
 * VEPA4 — Sparse typed relationship graph (CIV-1, AC-43).
 *
 * Individual recognition between stable subjects. Nodes are namespaced string
 * keys ('p:<particleIndex>', 'g:<groupId>'), so particles and groups share one
 * graph without colliding. Main-sim particle indices are append-only for the
 * life of a world (spawnOffspring appends, the dead keep their slot, and the
 * registry is recreated on restart/restore), which makes 'p:<index>' a stable
 * identity within a world.
 *
 * Each undirected pair holds one edge per type with a weight and a bounded
 * history ring. Additive only: never reads or writes particle stride fields.
 */
export const RELATION_TYPES = Object.freeze(['kin', 'care', 'ally', 'rival', 'trade', 'citizen']);
export const DEFAULT_HISTORY_CAP = 8;
export const DEFAULT_EDGE_CAP = 4096;

export const particleNode = (index) => `p:${index}`;
export const groupNode = (id) => `g:${id}`;

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const edgeKey = (a, b, type) => `${pairKey(a, b)}|${type}`;

export function createRelationshipGraph({ historyCap = DEFAULT_HISTORY_CAP, edgeCap = DEFAULT_EDGE_CAP } = {}) {
  return { edges: new Map(), adjacency: new Map(), historyCap, edgeCap, evicted: 0 };
}

function link(g, node, key) {
  let set = g.adjacency.get(node);
  if (!set) { set = new Set(); g.adjacency.set(node, set); }
  set.add(key);
}
function unlink(g, node, key) {
  const set = g.adjacency.get(node);
  if (!set) return;
  set.delete(key);
  if (set.size === 0) g.adjacency.delete(node);
}
function removeEdge(g, key) {
  const e = g.edges.get(key);
  if (!e) return;
  g.edges.delete(key); unlink(g, e.a, key); unlink(g, e.b, key);
}

/**
 * Add or reinforce a typed relation. Weight accumulates (clamped to [0, 1]);
 * every call appends one history entry, keeping only the newest `historyCap`.
 */
export function addRelation(g, a, b, type, { tick = 0, weight = 0.25, note = null } = {}) {
  if (!RELATION_TYPES.includes(type)) throw new RangeError(`unknown relation type ${type}`);
  if (a == null || b == null || a === b) return null;
  const key = edgeKey(a, b, type);
  let e = g.edges.get(key);
  if (!e) {
    if (g.edges.size >= g.edgeCap) {
      // Evict the stalest edge (oldest last-seen) so the graph stays bounded.
      let stalest = null;
      for (const [k, x] of g.edges) if (!stalest || x.lastTick < stalest[1].lastTick) stalest = [k, x];
      removeEdge(g, stalest[0]); g.evicted++;
    }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    e = { a: lo, b: hi, type, weight: 0, since: tick, lastTick: tick, count: 0, history: [] };
    g.edges.set(key, e); link(g, lo, key); link(g, hi, key);
  }
  e.weight = Math.max(0, Math.min(1, e.weight + weight));
  e.lastTick = tick; e.count++;
  e.history.push(note == null ? { tick, weight } : { tick, weight, note });
  if (e.history.length > g.historyCap) e.history.splice(0, e.history.length - g.historyCap);
  return e;
}

export function getRelation(g, a, b, type) { return g.edges.get(edgeKey(a, b, type)) || null; }

/** Relations touching a node, optionally of one type, strongest first. */
export function relationsOf(g, node, type = null) {
  const out = [];
  for (const key of g.adjacency.get(node) || []) {
    const e = g.edges.get(key);
    if (e && (!type || e.type === type)) out.push(e);
  }
  return out.sort((x, y) => y.weight - x.weight || (x.a < y.a ? -1 : 1));
}

/** Neighbour node keys of a node (optionally by type), strongest first. */
export function neighbours(g, node, type = null) {
  return relationsOf(g, node, type).map((e) => (e.a === node ? e.b : e.a));
}

/** Strongest relation of a type for a node, or null. */
export function strongestRelation(g, node, type = null) { return relationsOf(g, node, type)[0] || null; }

/** Count edges by type. */
export function relationCounts(g) {
  const counts = Object.fromEntries(RELATION_TYPES.map((t) => [t, 0]));
  for (const e of g.edges.values()) counts[e.type]++;
  return counts;
}

/** Drop every edge touching a node (e.g. a group that disbanded). */
export function forgetNode(g, node) {
  for (const key of [...(g.adjacency.get(node) || [])]) removeEdge(g, key);
}

export function serializeRelationshipGraph(g) {
  return { version: 1, historyCap: g.historyCap, edgeCap: g.edgeCap, evicted: g.evicted, edges: [...g.edges.values()].map((e) => ({ ...e, history: e.history.map((h) => ({ ...h })) })) };
}

export function restoreRelationshipGraph(snapshot) {
  if (!snapshot || snapshot.version !== 1) return createRelationshipGraph();
  const g = createRelationshipGraph({ historyCap: snapshot.historyCap, edgeCap: snapshot.edgeCap });
  g.evicted = snapshot.evicted || 0;
  for (const e of snapshot.edges || []) {
    if (!RELATION_TYPES.includes(e.type)) continue;
    const key = edgeKey(e.a, e.b, e.type);
    g.edges.set(key, { ...e, history: (e.history || []).slice(-g.historyCap) });
    link(g, e.a, key); link(g, e.b, key);
  }
  return g;
}
