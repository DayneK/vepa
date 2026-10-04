/**
 * VEPA4 — Civilisation runtime adapter (B7: AC-42..AC-55, decision D-006).
 *
 * One adapter that wires the existing civilisation ontology into the live sim:
 *
 *   family-kinship        births → kin edges + households; households move
 *                         care energy from the best-off to the neediest member
 *   group-tribe-clan      live groups join the federation; alliances link it;
 *                         vanished groups fission out
 *   nation-polity         a federation of ≥ POLITY_MIN_GROUPS founds a polity:
 *                         provinces, territory, citizenship, succession
 *   culture-memory        prestige-biased transmission + environmental
 *                         selection between federated groups
 *   relationship-lab      recorder → features → regime over each window
 *   synthetic-society     a durable record of the synthetic-organism census
 *   ecology               a durable record of the (inferred) food web
 *   species-lineage       per-species birth/death/generation records
 *   civilization          a summary record tying the above together
 *
 * Gate: runtimeConfig.civRuntime (default false, D-006 P-10). When off,
 * main.js never calls into this module and default behaviour is unchanged.
 * The only stride field it writes is ENERGY, by conserved household care
 * transfers (the sum of ENERGY over a household is unchanged).
 *
 * Identity: main-sim particle indices are append-only within a world (births
 * append, the dead keep their slot, the registry is rebuilt on restart and
 * restore), so an index is a stable particle id for the life of a world.
 *
 * Persistence: serializeCivRuntime() rides in the world save next to the
 * civilisation registry (whose lifecycle holds every record created here).
 */
import { STRIDE_INDEXES as S } from '../constants.js';
import {
  recordKin, createHousehold, joinHousehold, flowKinResources,
  createFederation, addFederationMember, linkFederation, fissionFederation,
  foundPolity, claimTerritory, addProvince, grantCitizenship, revokeCitizenship,
  nominateSuccessor, installSuccessor, cultureForGroup,
} from '../state/civilization.js';
import { createSystemRecord, updateSystemRecord, recordSystemEvent } from '../state/systemLifecycle.js';
import {
  createRelationshipGraph, addRelation, relationCounts, forgetNode, particleNode, groupNode,
  serializeRelationshipGraph, restoreRelationshipGraph,
} from '../state/relationshipGraph.js';
import { transmitWithSelection, groupPrestige } from '../state/culturalSelection.js';
import { createRelationshipRecorder, recordRelationshipEvent, eventsInWindow, serializeRecorder, restoreRecorder } from './relationshipRecorder.js';
import { extractRelationshipFeatures } from './relationshipFeatures.js';
import { classifyRelationshipRegime } from './relationshipRegimes.js';

export const CIV_RUNTIME_LIMITS = Object.freeze({
  households: 512, householdSize: 16, careShare: 0.05, careNeedBelow: 40,
  federationGroups: 12, polityMinGroups: 3, citizensPerStep: 64, maxCitizens: 1024,
  regimes: 32, cultureEvery: 4,
});

const L = CIV_RUNTIME_LIMITS;

export function createCivRuntime() {
  return {
    version: 1,
    graph: createRelationshipGraph(),
    recorder: createRelationshipRecorder(),
    householdOf: new Map(),  // particle index → household id
    generation: new Map(),   // particle index → generation (born in-world only)
    fedPolity: new Map(),    // federation id → polity id
    lineage: new Map(),      // species id → species-lineage record id
    records: {},             // singleton record ids per system
    regimes: [],             // newest last {tick, regime, reason}
    steps: 0, lastStepTick: 0,
    stats: { births: 0, deaths: 0, careTransfers: 0, careEnergy: 0, transmissions: 0, selectedOut: 0, successions: 0, polities: 0 },
  };
}

function singleton(rt, civ, system, attributes) {
  const id = rt.records[system];
  if (id && civ.lifecycle.records.has(id)) return id;
  const rec = createSystemRecord(civ.lifecycle, system, `civ-runtime:${system}`, attributes);
  rt.records[system] = rec.id;
  return rec.id;
}

function lineageRecord(rt, civ, species) {
  const id = rt.lineage.get(species);
  if (id && civ.lifecycle.records.has(id)) return id;
  const rec = createSystemRecord(civ.lifecycle, 'species-lineage', `species:${species}`, { species, births: 0, deaths: 0, maxGeneration: 0 });
  rt.lineage.set(species, rec.id);
  return rec.id;
}

function rel(rt, a, b, type, tick, weight) {
  addRelation(rt.graph, a, b, type, { tick, weight });
  recordRelationshipEvent(rt.recorder, { tick, type, a, b, weight });
}

/** Birth hook (main.js spawnOffspring). */
export function civRuntimeOnBirth(rt, civ, { parent, child, species = 0, tick = 0 }) {
  rt.stats.births++;
  const gen = parent >= 0 ? (rt.generation.get(parent) || 0) + 1 : 0;
  rt.generation.set(child, gen);
  const lid = lineageRecord(rt, civ, species);
  const lrec = civ.lifecycle.records.get(lid);
  updateSystemRecord(civ.lifecycle, lid, { attributes: { births: lrec.attributes.births + 1, maxGeneration: Math.max(lrec.attributes.maxGeneration, gen) } });
  if (!(parent >= 0)) return;
  recordKin(civ, parent, child, { kind: 'parent', strength: 0.8 });
  rel(rt, particleNode(parent), particleNode(child), 'kin', tick, 0.8);
  let hhId = rt.householdOf.get(parent);
  if (!hhId) {
    if (civ.households.size >= L.households) return;
    hhId = `hh:${parent}`;
    createHousehold(civ, hhId);
    joinHousehold(civ, hhId, parent);
    rt.householdOf.set(parent, hhId);
  }
  const hh = civ.households.get(hhId);
  if (hh && hh.members.size < L.householdSize) { joinHousehold(civ, hhId, child); rt.householdOf.set(child, hhId); }
}

/** Death hook (main.js lineage death scan). */
export function civRuntimeOnDeath(rt, civ, { index, species = 0 }) {
  rt.stats.deaths++;
  const lid = lineageRecord(rt, civ, species);
  const lrec = civ.lifecycle.records.get(lid);
  updateSystemRecord(civ.lifecycle, lid, { attributes: { deaths: lrec.attributes.deaths + 1 } });
  const hhId = rt.householdOf.get(index);
  if (hhId) {
    const hh = civ.households.get(hhId);
    if (hh) { hh.members.delete(index); if (hh.members.size === 0) civ.households.delete(hhId); }
    rt.householdOf.delete(index);
  }
  revokeCitizenship(civ, index);
  forgetNode(rt.graph, particleNode(index));
}

// governance events carry group objects; accept objects or ids.
const gid = (g) => (g && typeof g === 'object' ? g.id : g);

/** Alliance hook (governance:alliance). */
export function civRuntimeOnAlliance(rt, civ, { group: ga, other: gb, tick = 0 }) {
  const group = gid(ga), other = gid(gb);
  if (group == null || other == null || group === other) return;
  rel(rt, groupNode(group), groupNode(other), 'ally', tick, 0.5);
  for (const fedId of civ.federations.keys()) {
    const fed = civ.lifecycle.records.get(fedId);
    if (fed && fed.attributes.members.includes(group) && fed.attributes.members.includes(other)) linkFederation(civ, fedId, group, other, 0.5);
  }
}

/** Conflict hook (governance:conflict). */
export function civRuntimeOnConflict(rt, { group: ga, other: gb, tick = 0 }) {
  const group = gid(ga), other = gid(gb);
  if (group == null || other == null || group === other) return;
  rel(rt, groupNode(group), groupNode(other), 'rival', tick, 0.5);
}

function careStep(rt, civ, view, stride, tick) {
  let moved = 0, transfers = 0;
  for (const hh of civ.households.values()) {
    if (hh.members.size < 2) continue;
    const alive = [...hh.members].filter((m) => view[m * stride + S.DEAD] < 0.5);
    if (alive.length < 2) continue;
    let donor = alive[0];
    for (const m of alive) if (view[m * stride + S.ENERGY] > view[donor * stride + S.ENERGY]) donor = m;
    const donorE = view[donor * stride + S.ENERGY];
    const need = (m) => (m === donor ? 0 : Math.max(0, (L.careNeedBelow - view[m * stride + S.ENERGY]) / L.careNeedBelow));
    const budget = Math.max(0, donorE - L.careNeedBelow) * L.careShare;
    const scheduled = flowKinResources(civ, hh.id, budget, need);
    if (!(scheduled > 0)) continue;
    let needTotal = 0;
    for (const m of alive) needTotal += need(m);
    let given = 0;
    for (const m of alive) {
      const n = need(m);
      if (n <= 0) continue;
      const amount = scheduled * (n / needTotal);
      view[m * stride + S.ENERGY] += amount; given += amount;
      rel(rt, particleNode(donor), particleNode(m), 'care', tick, 0.1);
      transfers++;
    }
    view[donor * stride + S.ENERGY] = donorE - given; // conserved within the household
    moved += given;
  }
  rt.stats.careTransfers += transfers; rt.stats.careEnergy += moved;
  return moved;
}

function groupEnv(g) {
  const size = g.members ? g.members.size : 0;
  return { scarcity: 1 / (1 + Math.max(0, g.treasury || 0) / 20), threat: Math.min(1, (g.conflicts ? g.conflicts.size : 0) / 3), density: size / (size + 20) };
}

function tribeAndPolityStep(rt, civ, groups, view, stride, tick) {
  if (!groups) return;
  let fedId = civ.federations.keys().next().value;
  if (!fedId && groups.size >= 2) fedId = createFederation(civ, { name: 'first-tribe', kind: 'tribe' }).id;
  if (!fedId) return;
  const fed = () => civ.lifecycle.records.get(fedId);
  for (const gid of fed().attributes.members) if (!groups.has(gid)) fissionFederation(civ, fedId, gid, { minViable: 1 });
  for (const gid of groups.keys()) {
    if (fed().attributes.members.length >= L.federationGroups) break;
    if (!fed().attributes.members.includes(gid)) addFederationMember(civ, fedId, gid);
  }
  const members = fed().attributes.members.filter((g) => groups.has(g));
  if (members.length < L.polityMinGroups) return;
  let polityId = rt.fedPolity.get(fedId);
  if (!polityId || !civ.lifecycle.records.has(polityId)) {
    polityId = foundPolity(civ, { name: `${fed().attributes.name}-polity`, institutions: ['COUNCIL'] }).id;
    rt.fedPolity.set(fedId, polityId); rt.stats.polities++;
  }
  for (const gid of members) {
    const g = groups.get(gid);
    addProvince(civ, polityId, `province:${gid}`, [gid]);
    if (Number.isFinite(g.minX) && Number.isFinite(g.maxX)) claimTerritory(civ, polityId, { minX: g.minX, minY: g.minY, minZ: g.minZ, maxX: g.maxX, maxY: g.maxY, maxZ: g.maxZ });
  }
  let granted = 0;
  for (const gid of members) {
    for (const m of groups.get(gid).members) {
      if (granted >= L.citizensPerStep || civ.citizenOf.size >= L.maxCitizens) break;
      if (civ.citizenOf.get(m) === polityId || view[m * stride + S.DEAD] >= 0.5) continue;
      grantCitizenship(civ, m, polityId);
      rel(rt, particleNode(m), groupNode(gid), 'citizen', tick, 0.2);
      granted++;
    }
  }
  const line = civ.succession.get(polityId);
  const holderAlive = line && line.holderId != null && view[line.holderId * stride + S.DEAD] < 0.5 && civ.citizenOf.get(line.holderId) === polityId;
  if (line && !holderAlive) {
    let best = null;
    for (const [pid, pol] of civ.citizenOf) {
      if (pol !== polityId || view[pid * stride + S.DEAD] >= 0.5) continue;
      if (best === null || view[pid * stride + S.ENERGY] > view[best * stride + S.ENERGY]) best = pid;
    }
    if (best !== null) {
      nominateSuccessor(civ, polityId, best);
      if (installSuccessor(civ, polityId, best)) rt.stats.successions++;
    }
  }
}

function cultureStep(rt, civ, groups) {
  if (!groups || rt.steps % L.cultureEvery !== 0) return;
  const fedId = civ.federations.keys().next().value;
  const fed = fedId && civ.lifecycle.records.get(fedId);
  if (!fed) return;
  const ids = fed.attributes.members.filter((g) => groups.has(g) && cultureForGroup(civ, g));
  if (ids.length < 2) return;
  // Rank by prestige; the most prestigious culture teaches the least.
  ids.sort((a, b) => groupPrestige(groups.get(b)) - groupPrestige(groups.get(a)) || a - b);
  const src = ids[0], dst = ids[ids.length - 1];
  const out = transmitWithSelection(civ, cultureForGroup(civ, src), cultureForGroup(civ, dst), {
    sourcePrestige: groupPrestige(groups.get(src)), receiverPrestige: groupPrestige(groups.get(dst)), env: groupEnv(groups.get(dst)),
  });
  rt.stats.transmissions++; rt.stats.selectedOut += out.selectedOut.length;
}

function labStep(rt, civ, tick) {
  const events = eventsInWindow(rt.recorder, rt.lastStepTick, tick);
  const features = extractRelationshipFeatures(events, { spanTicks: tick - rt.lastStepTick });
  const { regime, reason } = classifyRelationshipRegime(features);
  const prev = rt.regimes.length ? rt.regimes[rt.regimes.length - 1].regime : null;
  rt.regimes.push({ tick, regime, reason });
  if (rt.regimes.length > L.regimes) rt.regimes.shift();
  const id = singleton(rt, civ, 'relationship-laboratory', {});
  updateSystemRecord(civ.lifecycle, id, { attributes: { regime, reason, features: { total: features.total, cooperation: features.cooperation, conflict: features.conflict, reciprocity: features.reciprocity } } });
  if (regime !== prev) recordSystemEvent(civ.lifecycle, id, 'regime-shift', { from: prev, to: regime, tick });
  return regime;
}

/**
 * One adapter step (main.js social cadence). ctx: { view, stride, groups, tick,
 * synthetic (syntheticSummary output), eco (ecoEngine) }.
 */
export function stepCivRuntime(rt, civ, { view, stride, groups = null, tick = 0, synthetic = null, eco = null }) {
  rt.steps++;
  careStep(rt, civ, view, stride, tick);
  tribeAndPolityStep(rt, civ, groups, view, stride, tick);
  cultureStep(rt, civ, groups);
  const regime = labStep(rt, civ, tick);
  if (synthetic) {
    const id = singleton(rt, civ, 'synthetic-society', {});
    const prev = civ.lifecycle.records.get(id).attributes.organisms;
    updateSystemRecord(civ.lifecycle, id, { attributes: { ...synthetic, tick } });
    if (prev !== synthetic.organisms) recordSystemEvent(civ.lifecycle, id, 'census', { organisms: synthetic.organisms, tick });
  }
  if (eco) {
    const id = singleton(rt, civ, 'ecology', {});
    const web = [...eco.foodWeb.values()].sort((a, b) => b.strength - a.strength).slice(0, 12)
      .map((e) => ({ prey: e.prey, predator: e.predator, confidence: e.strength, evidence: 'inferred' }));
    updateSystemRecord(civ.lifecycle, id, { attributes: { foodWeb: web, niches: eco.niches.size, extinct: eco.extinct.length, tick } });
  }
  const civId = singleton(rt, civ, 'civilization', {});
  updateSystemRecord(civ.lifecycle, civId, { attributes: {
    tick, regime, households: civ.households.size, federations: civ.federations.size, polities: civ.polities.size,
    citizens: civ.citizenOf.size, kinEdges: civ.kinEdges.size, relations: relationCounts(rt.graph), stats: { ...rt.stats },
  } });
  rt.lastStepTick = tick;
  return rt;
}

export function civRuntimeReport(rt) {
  return { steps: rt.steps, regime: rt.regimes.length ? rt.regimes[rt.regimes.length - 1].regime : 'quiet', relations: relationCounts(rt.graph), stats: { ...rt.stats } };
}

export function serializeCivRuntime(rt) {
  return {
    version: 1, steps: rt.steps, lastStepTick: rt.lastStepTick, stats: { ...rt.stats }, records: { ...rt.records },
    regimes: rt.regimes.map((r) => ({ ...r })), householdOf: [...rt.householdOf], generation: [...rt.generation],
    fedPolity: [...rt.fedPolity], lineage: [...rt.lineage],
    graph: serializeRelationshipGraph(rt.graph), recorder: serializeRecorder(rt.recorder),
  };
}

export function restoreCivRuntime(s) {
  const rt = createCivRuntime();
  if (!s || s.version !== 1) return rt;
  rt.steps = s.steps || 0; rt.lastStepTick = s.lastStepTick || 0;
  Object.assign(rt.stats, s.stats || {}); rt.records = { ...(s.records || {}) };
  rt.regimes = (s.regimes || []).map((r) => ({ ...r }));
  rt.householdOf = new Map(s.householdOf || []); rt.generation = new Map(s.generation || []);
  rt.fedPolity = new Map(s.fedPolity || []); rt.lineage = new Map(s.lineage || []);
  rt.graph = restoreRelationshipGraph(s.graph); rt.recorder = restoreRecorder(s.recorder);
  return rt;
}
