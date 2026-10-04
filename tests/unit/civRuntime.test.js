// B7 (AC-42, AC-44, AC-47..AC-55): the civilisation runtime adapter in a live
// headless run of main.js's loop (tests/helpers/civWorld.js): real solver births
// and deaths, declared groups, governance alliances, the civilisation registry —
// then a world save → JSON → restore and a continued run.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCivWorld, runCivWorld, saveAndRestore } from '../helpers/civWorld.js';
import { civRuntimeReport, createCivRuntime, stepCivRuntime, civRuntimeOnBirth, CIV_RUNTIME_LIMITS } from '../../src/engines/civRuntime.js';
import { createCivilizationRegistry, civilizationReport, getKin, householdOf } from '../../src/state/civilization.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import { STRIDE_INDEXES as S, PARTICLE_STRIDE as P } from '../../src/constants.js';
import { particleNode } from '../../src/state/relationshipGraph.js';

let w;
beforeAll(() => { w = runCivWorld(createCivWorld(), 300); }, 60000);

const recordOf = (world, system) => world.civ.lifecycle.records.get(world.rt.records[system]);

describe('civilisation runtime adapter (B7)', () => {
  it('is off by default and every main.js call site is gated on it (D-006 P-10)', () => {
    expect(runtimeConfig.civRuntime).toBe(false);
    const src = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
    // Every adapter call in main.js has civRuntimeOn() on its line or within
    // the three lines above it (an enclosing `if (civRuntimeOn())` / ternary).
    const lines = src.split('\n');
    const sites = lines.map((l, i) => [l, i]).filter(([l]) => /\b(civRuntimeOnBirth|civRuntimeOnDeath|civRuntimeOnAlliance|civRuntimeOnConflict|stepCivRuntime|serializeCivRuntime|civRuntimeReport)\(/.test(l) && !/^import /.test(l));
    expect(sites.length).toBeGreaterThanOrEqual(7);
    for (const [line, i] of sites) expect(lines.slice(Math.max(0, i - 3), i + 1).join('\n'), line).toMatch(/civRuntimeOn\(\)/);
  });

  it('family-kinship (AC-42/AC-47): live births create kin edges and households', () => {
    expect(w.events.births).toBeGreaterThan(10);
    expect(w.rt.stats.births).toBe(w.events.births);
    const child = w.count - 1, parent = [...w.rt.graph.adjacency.get(particleNode(child))].length;
    expect(parent).toBeGreaterThan(0);
    expect(w.civ.kinEdges.size).toBeGreaterThan(0);
    const edge = [...w.civ.kinEdges.values()][0];
    expect(getKin(w.civ, edge.a, edge.b)).toBe(edge);
    expect(householdOf(w.civ, edge.b)).not.toBe(null);
  });

  it('family-kinship: household care moves energy every step and conserves it', () => {
    expect(w.rt.stats.careTransfers).toBeGreaterThan(0);
    const civ = createCivilizationRegistry(), rt = createCivRuntime();
    const view = new Float32Array(3 * P);
    [90, 10, 5].forEach((e, i) => { view[i * P + S.ENERGY] = e; });
    civRuntimeOnBirth(rt, civ, { parent: 0, child: 1 }); civRuntimeOnBirth(rt, civ, { parent: 0, child: 2 });
    stepCivRuntime(rt, civ, { view, stride: P, tick: 1 });
    const e = [0, 1, 2].map((i) => view[i * P + S.ENERGY]);
    expect(e[0]).toBeLessThan(90); expect(e[1]).toBeGreaterThan(10); expect(e[2]).toBeGreaterThan(5);
    expect(e[2] - 5).toBeGreaterThan(e[1] - 10); // the neediest gets most
    expect(e[0] + e[1] + e[2]).toBeCloseTo(105, 4);
  });

  it('group-tribe-clan (AC-48): live groups join the federation and alliances link it', () => {
    const fed = recordOf(w, 'civilization') && [...w.civ.federations.keys()].map((id) => w.civ.lifecycle.records.get(id))[0];
    expect(fed.attributes.members.sort()).toEqual([...w.groups.groups.keys()].sort());
    expect(w.events.alliances).toBeGreaterThan(0);
    expect(civRuntimeReport(w.rt).relations.ally).toBeGreaterThan(0);
  });

  it('nation-polity (AC-44/AC-49): the federation founds a polity with territory, citizens and succession', () => {
    const [polityId] = [...w.civ.polities.keys()];
    const pol = w.civ.lifecycle.records.get(polityId);
    expect(pol.attributes.provinces.length).toBe(w.groups.groups.size);
    expect(Number.isFinite(pol.attributes.territory.minX) && pol.attributes.territory.maxX > pol.attributes.territory.minX).toBe(true);
    expect(pol.attributes.citizens).toBeGreaterThan(0);
    const line = w.civ.succession.get(polityId);
    expect(w.civ.citizenOf.get(line.holderId)).toBe(polityId);
    // The ruler dies → the next social step installs a living citizen.
    const before = line.term, old = line.holderId;
    w.view[old * P + S.DEAD] = 1;
    runCivWorld(w, 10);
    expect(w.civ.succession.get(polityId).term).toBe(before + 1);
    expect(w.civ.succession.get(polityId).holderId).not.toBe(old);
  });

  it('culture-memory (AC-51): prestige-biased transmission runs between federated groups', () => {
    expect(w.rt.stats.transmissions).toBeGreaterThan(0);
    const transmitted = [...w.civ.cultures.keys()].map((id) => w.civ.lifecycle.records.get(id)).filter((r) => (r.metrics['culture-transmitted'] || 0) > 0);
    expect(transmitted.length).toBeGreaterThan(0);
  });

  it('relationship-lab, synthetic-society, ecology, species-lineage, civilization (AC-50, AC-52..AC-55) keep durable records', () => {
    expect(recordOf(w, 'relationship-laboratory').attributes.regime).toBeTruthy();
    expect(recordOf(w, 'synthetic-society').attributes).toMatchObject({ organisms: 0 });
    const civRec = recordOf(w, 'civilization').attributes;
    expect(civRec.polities).toBe(1); expect(civRec.stats.births).toBe(w.rt.stats.births);
    const lineage = [...w.rt.lineage.values()].map((id) => w.civ.lifecycle.records.get(id).attributes);
    expect(lineage.reduce((s, l) => s + l.births, 0)).toBe(w.rt.stats.births);
    expect(Math.max(...lineage.map((l) => l.maxGeneration))).toBeGreaterThanOrEqual(1);
    // Ecology: the inferred food web is recorded and labelled as inference.
    const rt = createCivRuntime(), civ = createCivilizationRegistry();
    stepCivRuntime(rt, civ, { view: new Float32Array(P), stride: P, tick: 1, eco: { foodWeb: new Map([['0->1', { prey: 0, predator: 1, strength: 0.4 }]]), niches: new Map([[0, {}]]), extinct: [] } });
    const eco = civ.lifecycle.records.get(rt.records.ecology).attributes;
    expect(eco.foodWeb).toEqual([{ prey: 0, predator: 1, confidence: 0.4, evidence: 'inferred' }]);
  });

  it('every record survives world save → JSON → restore, and the restored world keeps running', () => {
    const r = saveAndRestore(w);
    expect(civilizationReport(r.civ)).toEqual(civilizationReport(w.civ));
    expect(civRuntimeReport(r.rt)).toEqual(civRuntimeReport(w.rt));
    expect(r.rt.graph.edges.size).toBe(w.rt.graph.edges.size);
    expect(r.rt.recorder.events).toEqual(w.rt.recorder.events);
    expect(r.count).toBe(w.count);
    const births = r.rt.stats.births;
    runCivWorld(r, 60);
    expect(r.rt.stats.births).toBeGreaterThanOrEqual(births);
    expect(r.rt.steps).toBe(w.rt.steps + 6);
  });

  it('is deterministic and bounded', () => {
    const a = runCivWorld(createCivWorld({ seed: 9 }), 120), b = runCivWorld(createCivWorld({ seed: 9 }), 120);
    expect(civRuntimeReport(a.rt)).toEqual(civRuntimeReport(b.rt));
    expect(w.civ.households.size).toBeLessThanOrEqual(CIV_RUNTIME_LIMITS.households);
    expect(w.civ.citizenOf.size).toBeLessThanOrEqual(CIV_RUNTIME_LIMITS.maxCitizens);
    expect(w.rt.regimes.length).toBeLessThanOrEqual(CIV_RUNTIME_LIMITS.regimes);
  });
});
