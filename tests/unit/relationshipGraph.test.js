// CIV-1 (AC-43): typed relationship graph — bounded history, queries, round trip.
import { describe, it, expect } from 'vitest';
import {
  createRelationshipGraph, addRelation, getRelation, relationsOf, neighbours, strongestRelation,
  relationCounts, forgetNode, serializeRelationshipGraph, restoreRelationshipGraph, particleNode as p, groupNode as g,
} from '../../src/state/relationshipGraph.js';

describe('relationship graph (CIV-1)', () => {
  it('stores one edge per pair and type, undirected, with accumulating weight', () => {
    const G = createRelationshipGraph();
    addRelation(G, p(1), p(2), 'kin', { tick: 1, weight: 0.5 });
    addRelation(G, p(2), p(1), 'kin', { tick: 2, weight: 0.7 });
    addRelation(G, p(1), p(2), 'care', { tick: 3 });
    expect(getRelation(G, p(2), p(1), 'kin')).toMatchObject({ weight: 1, count: 2, since: 1, lastTick: 2 });
    expect(relationCounts(G)).toMatchObject({ kin: 1, care: 1 });
    expect(addRelation(G, p(1), p(1), 'kin')).toBe(null);
    expect(() => addRelation(G, p(1), p(3), 'friend')).toThrow(/unknown relation type/);
  });

  it('keeps only the newest historyCap entries per edge', () => {
    const G = createRelationshipGraph({ historyCap: 3 });
    for (let t = 1; t <= 10; t++) addRelation(G, p(1), p(2), 'trade', { tick: t, weight: 0.01 });
    const e = getRelation(G, p(1), p(2), 'trade');
    expect(e.count).toBe(10);
    expect(e.history.map((h) => h.tick)).toEqual([8, 9, 10]);
  });

  it('answers neighbour and strongest queries by type', () => {
    const G = createRelationshipGraph();
    addRelation(G, p(1), p(2), 'kin', { weight: 0.2 });
    addRelation(G, p(1), p(3), 'kin', { weight: 0.9 });
    addRelation(G, p(1), g(7), 'citizen', { weight: 0.5 });
    expect(neighbours(G, p(1), 'kin')).toEqual([p(3), p(2)]);
    expect(strongestRelation(G, p(1)).b).toBe(p(3));
    expect(relationsOf(G, p(1)).length).toBe(3);
    forgetNode(G, p(3));
    expect(neighbours(G, p(1), 'kin')).toEqual([p(2)]);
  });

  it('is bounded: the stalest edge is evicted at edgeCap', () => {
    const G = createRelationshipGraph({ edgeCap: 3 });
    for (let i = 0; i < 5; i++) addRelation(G, p(0), p(i + 1), 'ally', { tick: i });
    expect(G.edges.size).toBe(3);
    expect(G.evicted).toBe(2);
    expect(getRelation(G, p(0), p(1), 'ally')).toBe(null);
  });

  it('round-trips through JSON save/restore', () => {
    const G = createRelationshipGraph({ historyCap: 4 });
    addRelation(G, p(1), p(2), 'kin', { tick: 5, note: 'birth' });
    addRelation(G, g(1), g(2), 'rival', { tick: 6 });
    const R = restoreRelationshipGraph(JSON.parse(JSON.stringify(serializeRelationshipGraph(G))));
    expect(serializeRelationshipGraph(R)).toEqual(serializeRelationshipGraph(G));
    expect(neighbours(R, g(1))).toEqual([g(2)]);
    expect(restoreRelationshipGraph({ version: 99 }).edges.size).toBe(0);
  });
});
