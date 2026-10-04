import {
  LAW_COUNT,
  LAW_INDEXES,
  LAW_CATEGORIES,
  STRIDE_INDEXES,
  DNA_INDEXES,
} from '../constants.js';
import { WORLD_PARAM_DEFS } from '../state/worldParams.js';
import {
  LAW_RELATIONSHIPS,
  LAW_RELATIONSHIP_TYPES,
  validateLawOntology,
} from '../state/lawOntology.js';

const NAME_BY_INDEX = Object.fromEntries(
  Object.entries(LAW_INDEXES).map(([name, index]) => [index, name]),
);
const CATEGORY_BY_NAME = {};
for (const [category, record] of Object.entries(LAW_CATEGORIES)) {
  for (const index of record.laws) CATEGORY_BY_NAME[NAME_BY_INDEX[index]] = category;
}

const CANONICAL_STATE_NAMES = new Set([
  ...Object.keys(STRIDE_INDEXES),
  ...Object.keys(DNA_INDEXES),
  ...WORLD_PARAM_DEFS.map(({ key }) => key),
  'ACCELERATION',
  'DNA_CACHE',
  'CHEMICAL_STATE',
  'HEAT',
  'LIGHT',
  'MOMENTUM',
  'POSITION',
  'VELOCITY',
  'FORCE',
  'BONDS',
  'LIFECYCLE',
  'QUANTUM_STATE',
  'PHASE',
  'TRAILS',
  'GROUP_STATE',
  // Relationship vocabulary includes compact ranges for the six bond slots.
  'BOND_PARTNER_1-6',
]);

function lawName(value) {
  if (typeof value === 'number') return NAME_BY_INDEX[value];
  return value;
}

const EDGE_TYPES = ['dependsOn', 'synergizesWith', 'antagonizes'];

function relationshipTargets(name, type) {
  const targets = LAW_RELATIONSHIPS[name]?.[type];
  return Array.isArray(targets) ? targets.map(lawName) : [];
}

export function getLawRecord(lawNameOrIndex) {
  const name = lawName(lawNameOrIndex);
  if (!name || LAW_INDEXES[name] === undefined) throw new RangeError(`Unknown law: ${lawNameOrIndex}`);
  const relationships = LAW_RELATIONSHIPS[name] || {};
  return Object.freeze({
    id: LAW_INDEXES[name],
    name,
    category: CATEGORY_BY_NAME[name],
    relationships,
  });
}

export function getIncomingRelationships(lawNameOrIndex, type = 'dependsOn') {
  const target = lawName(lawNameOrIndex);
  if (!target || LAW_INDEXES[target] === undefined) throw new RangeError(`Unknown law: ${lawNameOrIndex}`);
  return Object.keys(LAW_INDEXES).filter((source) => relationshipTargets(source, type).includes(target));
}

export function inspectLaw(lawNameOrIndex) {
  const record = getLawRecord(lawNameOrIndex);
  const incoming = {};
  for (const type of LAW_RELATIONSHIP_TYPES) incoming[type] = getIncomingRelationships(record.name, type);
  return Object.freeze({ ...record, incoming: Object.freeze(incoming) });
}

function relationshipEdges(type) {
  return Object.entries(LAW_RELATIONSHIPS).flatMap(([source, record]) =>
    (Array.isArray(record[type]) ? record[type] : [])
      .filter((target) => LAW_INDEXES[target] !== undefined)
      .map((target) => ({ source, target })),
  );
}

export function exportLawGraph() {
  return {
    version: 1,
    lawCount: LAW_COUNT,
    laws: Object.keys(LAW_INDEXES).map((name) => ({
      id: LAW_INDEXES[name],
      name,
      category: CATEGORY_BY_NAME[name],
    })),
    relationships: Object.fromEntries(LAW_RELATIONSHIP_TYPES
      .filter((type) => type !== 'notes')
      .map((type) => [type, relationshipEdges(type)])),
  };
}

export function exportLawGraphJson(space = 2) {
  return JSON.stringify(exportLawGraph(), null, space);
}

export function exportLawGraphMermaid() {
  const lines = ['graph TD'];
  for (const [name, index] of Object.entries(LAW_INDEXES)) {
    lines.push(`    ${name}["${index}: ${name}"]`);
  }
  for (const type of EDGE_TYPES) {
    for (const { source, target } of relationshipEdges(type)) {
      const style = type === 'antagonizes' ? ' -. antagonizes .-> ' : type === 'synergizesWith' ? ' -. synergizes .-> ' : ' --> ';
      lines.push(`    ${source}${style}${target}`);
    }
  }
  return lines.join('\n');
}

function directedEdgesForCycles() {
  return relationshipEdges('dependsOn').map(({ source, target }) => ({ source, target }));
}

/** Return simple directed cycles, canonicalized to avoid duplicate rotations. */
export function findLawCycles() {
  const edges = directedEdgesForCycles();
  const adjacency = Object.fromEntries(Object.keys(LAW_INDEXES).map((name) => [name, []]));
  for (const { source, target } of edges) adjacency[source].push(target);
  const cycles = new Set();
  function visit(start, current, path) {
    for (const next of adjacency[current]) {
      if (next === start) {
        const cycle = [...path].sort().join('|');
        cycles.add(cycle);
      } else if (!path.includes(next) && path.length < Object.keys(LAW_INDEXES).length) {
        visit(start, next, [...path, next]);
      }
    }
  }
  for (const name of Object.keys(LAW_INDEXES)) visit(name, name, [name]);
  return [...cycles].map((cycle) => cycle.split('|'));
}

export function validateLawGraph() {
  const errors = [...validateLawOntology()];
  const names = Object.keys(LAW_INDEXES);
  if (names.length !== LAW_COUNT) errors.push(`registry has ${names.length} names, expected ${LAW_COUNT}`);
  const indexes = Object.values(LAW_INDEXES);
  if (new Set(indexes).size !== indexes.length) errors.push('law indexes are duplicated');
  for (let i = 0; i < LAW_COUNT; i++) {
    if (NAME_BY_INDEX[i] === undefined) errors.push(`missing law index ${i}`);
    if (!CATEGORY_BY_NAME[NAME_BY_INDEX[i]]) errors.push(`law ${i} has no category`);
  }
  for (const [name, record] of Object.entries(LAW_RELATIONSHIPS)) {
    for (const type of ['reads', 'writes', 'consumes', 'produces']) {
      for (const state of record[type] || []) {
        const base = String(state).split(/\s|[/+]/)[0];
        if (!CANONICAL_STATE_NAMES.has(base) && !CANONICAL_STATE_NAMES.has(state)) {
          errors.push(`${name}.${type} references unknown state ${state}`);
        }
      }
    }
  }
  return [...new Set(errors)];
}

/**
 * LRA-4 (AC-32): classify feedback cycles beyond hard dependencies.
 *  - hard: directed dependsOn cycles (findLawCycles)
 *  - synergy: mutual synergizesWith pairs (A lists B and B lists A)
 *  - declaredFeedback: laws with an explicit feedback polarity
 *  - resource: two-law loops where A writes a state field B reads and B writes one A reads
 *    (kinematic POS/VEL/ACCELERATION excluded)
 *  - selfLoop: laws that read and write the same stride field (self-reinforcing candidates)
 * Descriptive only; derived from the ontology.
 */
export function classifyLawCycles() {
  const names = Object.keys(LAW_INDEXES);
  const rec = (n) => LAW_RELATIONSHIPS[n] || {};
  const synergy = [];
  for (const a of names) for (const b of rec(a).synergizesWith || []) {
    if (a < b && (rec(b).synergizesWith || []).includes(a)) synergy.push([a, b]);
  }
  const declaredFeedback = names.filter((n) => rec(n).feedback).map((n) => ({ law: n, polarity: rec(n).feedback }));
  // Kinematic fields (POS_*, VEL_*) couple almost every force law through
  // integration, so resource loops are computed over state fields only.
  const kinematic = (f) => /^(POS|VEL)_[XYZ]$|^(POS|VEL)_X\/Y\/Z$|^ACCELERATION$/.test(f);
  const reads = (n) => new Set((rec(n).reads || []).filter((f) => !kinematic(f)));
  const writes = (n) => new Set((rec(n).writes || []).filter((f) => !kinematic(f)));
  const resource = [];
  for (let i = 0; i < names.length; i++) {
    const a = names[i], wa = writes(a), ra = reads(a);
    if (!wa.size) continue;
    for (let j = i + 1; j < names.length; j++) {
      const b = names[j];
      const ab = [...wa].filter((f) => reads(b).has(f));
      if (!ab.length) continue;
      const ba = [...writes(b)].filter((f) => ra.has(f));
      if (ba.length) resource.push({ laws: [a, b], aToB: ab, bToA: ba });
    }
  }
  const selfLoop = names.filter((n) => [...writes(n)].some((f) => reads(n).has(f)));
  return { hard: findLawCycles(), synergy, declaredFeedback, resource, selfLoop };
}
