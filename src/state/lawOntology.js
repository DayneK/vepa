import { LAW_INDEXES } from '../constants.js';

/**
 * Relationship vocabulary for the law ontology.
 *
 * These are descriptive contracts in Roadmap 1. They do not gate, reorder, or
 * otherwise change solver behavior until a later roadmap explicitly consumes
 * them.
 */
export const LAW_RELATIONSHIP_TYPES = Object.freeze([
  'dependsOn',
  'synergizesWith',
  'antagonizes',
  'transforms',
  'reads',
  'writes',
  'consumes',
  'produces',
  'feedback',
  'notes',
]);

export const LAW_EDGE_RELATIONSHIP_TYPES = Object.freeze([
  'dependsOn',
  'synergizesWith',
  'antagonizes',
]);

const LAW_NAMES = new Set(Object.keys(LAW_INDEXES));

function freezeRecord(record) {
  const result = {};
  for (const type of LAW_RELATIONSHIP_TYPES) {
    const value = record[type];
    if (type === 'feedback') {
      if (value !== undefined) result[type] = value;
    } else if (value !== undefined) {
      result[type] = Object.freeze([...value]);
    }
  }
  return Object.freeze(result);
}

/**
 * First ontology slice: the highest-value architectural relationships from the
 * law-system review. Unlisted relationship types are intentionally absent, not
 * inferred. Names are used instead of numeric indexes so the metadata remains
 * readable and reviewable.
 */
const DECLARED_LAW_RELATIONSHIPS = Object.freeze({
  COLL: freezeRecord({
    synergizesWith: ['CONTACT', 'MOMENTUM'],
    antagonizes: ['FRAGMENTATION'],
    transforms: ['OVERLAP -> IMPACT_RESPONSE'],
    reads: ['RADIUS', 'MASS', 'VEL_X', 'VEL_Y', 'VEL_Z'],
    writes: ['VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  CONTACT: freezeRecord({
    synergizesWith: ['COLL', 'CONSTRAINT'],
    transforms: ['OVERLAP -> SEPARATION'],
    reads: ['RADIUS', 'MASS', 'STIFFNESS'],
    writes: ['ACCELERATION'],
  }),
  MOMENTUM: freezeRecord({
    synergizesWith: ['CONTACT', 'INERTIA', 'TORQUE'],
    transforms: ['RELATIVE_VELOCITY -> VELOCITY_EXCHANGE'],
    reads: ['MASS', 'VEL_X', 'VEL_Y', 'VEL_Z'],
    writes: ['VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  MASS_INERTIA: freezeRecord({
    synergizesWith: ['GRAV', 'MOMENTUM'],
    antagonizes: ['TORQUE'],
    transforms: ['FORCE -> MASS_SCALED_ACCELERATION'],
    reads: ['MASS', 'FORCE', 'INERTIA'],
    writes: ['ACCELERATION'],
    notes: ['Legacy physics inertia proxy; compare with INERTIA before changing either implementation.'],
  }),
  INERTIA: freezeRecord({
    synergizesWith: ['MOMENTUM', 'TORQUE'],
    transforms: ['FORCE -> ACCELERATION_RESISTANCE'],
    reads: ['MASS', 'FORCE', 'INERTIA'],
    writes: ['ACCELERATION'],
    notes: ['Mechanics inertia proxy; possible semantic overlap with MASS_INERTIA is intentionally recorded.'],
  }),
  BOND: freezeRecord({
    synergizesWith: ['CONSTRAINT', 'POLYMER', 'TOPOLOGY', 'ADHESION'],
    transforms: ['PROXIMITY -> PERSISTENT_CONNECTION'],
    reads: ['BOND_COUNT', 'BOND_PARTNER_1-6', 'STIFFNESS'],
    writes: ['BOND_COUNT', 'BOND_PARTNER_1-6'],
  }),
  CONSTRAINT: freezeRecord({
    dependsOn: ['BOND'],
    synergizesWith: ['TOPOLOGY', 'CONTACT'],
    transforms: ['DISTANCE_ERROR -> RESTORING_FORCE'],
    reads: ['RADIUS', 'BOND_COUNT', 'BOND_PARTNER_1-6'],
    writes: ['ACCELERATION'],
  }),
  TOPOLOGY: freezeRecord({
    dependsOn: ['BOND', 'CONSTRAINT'],
    synergizesWith: ['POLYMER', 'CRYSTALLIZATION'],
    transforms: ['BOND_GRAPH -> STRUCTURAL_CORRECTION'],
    reads: ['BOND_COUNT', 'BOND_PARTNER_1-6'],
    writes: ['ACCELERATION'],
  }),
  ADHESION: freezeRecord({
    synergizesWith: ['CONTACT', 'BOND'],
    antagonizes: ['FRAGMENTATION'],
    transforms: ['NEAR_CONTACT -> ATTRACTION'],
    reads: ['RADIUS', 'BOND_COUNT'],
    writes: ['ACCELERATION'],
  }),
  AUTOCATALYSIS: freezeRecord({
    synergizesWith: ['CATALYSIS_LAW', 'OXIDATION', 'EXOTHERMIC'],
    consumes: ['ENERGY'],
    produces: ['HEAT'],
    feedback: 'POSITIVE',
    transforms: ['REACTION_RATE -> CATALYST_ACTIVITY'],
  }),
  HEAT: freezeRecord({
    synergizesWith: ['COLD', 'EQUILIBRIUM', 'CONVECTION', 'OXIDATION'],
    antagonizes: ['COLD'],
    transforms: ['ENERGY -> TEMPERATURE'],
    reads: ['ENERGY', 'TEMPERATURE', 'HEAT_OUTPUT'],
    writes: ['TEMPERATURE', 'VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  COLD: freezeRecord({
    antagonizes: ['HEAT'],
    transforms: ['LOW_TEMPERATURE -> VELOCITY_DAMPING'],
    reads: ['TEMPERATURE', 'VEL_X', 'VEL_Y', 'VEL_Z'],
    writes: ['VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  IONIZATION: freezeRecord({
    synergizesWith: ['PLASMA', 'ELECTRIC_FIELD', 'CHARGE_LAW'],
    transforms: ['ENERGY_AND_TEMPERATURE -> CHARGE'],
    reads: ['TEMPERATURE', 'ENERGY', 'RADIATION_EXPOSURE'],
    writes: ['CHARGE', 'TEMPERATURE'],
  }),
  DISCHARGE: freezeRecord({
    synergizesWith: ['CURRENT', 'PLASMA', 'HEAT'],
    transforms: ['CHARGE -> HEAT_AND_IMPULSE'],
    reads: ['CHARGE', 'CONDUCTIVITY'],
    writes: ['CHARGE', 'TEMPERATURE', 'VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  MEMORY: freezeRecord({
    synergizesWith: ['LEARN', 'PREDICT', 'HISTORY', 'FEEDBACK'],
    writes: ['MEMORY'],
  }),
  OBSERVER: freezeRecord({
    dependsOn: ['MEMORY'],
    synergizesWith: ['DECOHERENCE', 'WAVE_PARTICLE'],
    reads: ['MEMORY', 'QUANTUM_STATE', 'PHASE'],
    writes: ['QUANTUM_STATE', 'PHASE'],
  }),
  NAVIGATION: freezeRecord({
    dependsOn: ['MEMORY'],
    synergizesWith: ['HISTORY', 'PREDICT', 'TRACK'],
    reads: ['MEMORY', 'POS_X', 'POS_Y', 'POS_Z', 'SIGNAL'],
    writes: ['VEL_X', 'VEL_Y', 'VEL_Z'],
  }),
  LEARN: freezeRecord({
    dependsOn: ['MEMORY'],
    synergizesWith: ['PREDICT', 'CULTURE'],
    transforms: ['MEMORY_AND_ERROR -> BEHAVIOR_UPDATE'],
    reads: ['MEMORY', 'SIGNAL'],
    writes: ['MEMORY', 'DNA_CACHE'],
  }),
  FEEDBACK: freezeRecord({
    dependsOn: ['MEMORY'],
    feedback: 'POSITIVE',
    transforms: ['MEMORY_TRACE -> AMPLIFIED_RESPONSE'],
    reads: ['MEMORY', 'SIGNAL'],
    writes: ['ACCELERATION', 'MEMORY'],
  }),
  GENOTYPE: freezeRecord({
    synergizesWith: ['PHENOTYPE', 'REPRO', 'RADIATION'],
    transforms: ['PARENT_DNA -> OFFSPRING_DNA'],
    reads: ['DNA_CACHE', 'RADIATION_EXPOSURE', 'MUTATION'],
    writes: ['DNA_CACHE'],
  }),
  PHENOTYPE: freezeRecord({
    dependsOn: ['GENOTYPE'],
    transforms: ['GENOTYPE -> EXPRESSED_TRAITS'],
    reads: ['DNA_CACHE', 'DOMINANCE', 'REGULATORY_DEPTH'],
    writes: ['RADIUS', 'COLOR_R', 'COLOR_G', 'COLOR_B'],
  }),
  ENTANGLEMENT: freezeRecord({
    synergizesWith: ['OBSERVER', 'TELEPORT'],
    transforms: ['PAIR_STATE -> CORRELATION'],
    reads: ['ENTANGLE_ID', 'ENTANGLE_PHASE'],
    writes: ['ENTANGLE_ID', 'ENTANGLE_PHASE'],
  }),
  TELEPORT: freezeRecord({
    dependsOn: ['ENTANGLEMENT'],
    consumes: ['ENTANGLE_PHASE'],
    transforms: ['CORRELATION -> POSITION_TRANSFER'],
    reads: ['ENTANGLE_ID', 'ENTANGLE_PHASE', 'POS_X', 'POS_Y', 'POS_Z'],
    writes: ['POS_X', 'POS_Y', 'POS_Z'],
  }),
});

// Every registered law is represented. Empty records are intentional: this
// prevents the ontology from inventing semantics while keeping the graph
// total and queryable for all 136 registry entries.
export const LAW_RELATIONSHIPS = Object.freeze(
  Object.fromEntries(Object.keys(LAW_INDEXES).map((lawName) => [
    lawName,
    DECLARED_LAW_RELATIONSHIPS[lawName] || Object.freeze({}),
  ])),
);

/** Return a defensive empty relationship record for laws without metadata. */
export function getLawRelationships(lawName) {
  if (!LAW_NAMES.has(lawName)) throw new RangeError(`Unknown law name: ${lawName}`);
  return LAW_RELATIONSHIPS[lawName] || Object.freeze({});
}

/**
 * Validate ontology references and shape without applying any runtime effects.
 * @returns {string[]} human-readable validation errors
 */
export function validateLawOntology() {
  const errors = [];
  const allowed = new Set(LAW_RELATIONSHIP_TYPES);
  const resourceTypes = new Set(['reads', 'writes', 'consumes', 'produces', 'transforms']);

  for (const [lawName, record] of Object.entries(LAW_RELATIONSHIPS)) {
    if (!LAW_NAMES.has(lawName)) errors.push(`Unknown source law: ${lawName}`);
    for (const key of Object.keys(record)) {
      if (!allowed.has(key) && key !== 'notes') errors.push(`${lawName}: unknown relationship type ${key}`);
      if (key === 'feedback' && !['POSITIVE', 'NEGATIVE', 'MIXED'].includes(record[key])) {
        errors.push(`${lawName}: invalid feedback polarity ${record[key]}`);
      }
      if (resourceTypes.has(key) && !Array.isArray(record[key])) {
        errors.push(`${lawName}.${key} must be an array`);
      }
    }
    for (const type of ['dependsOn', 'synergizesWith', 'antagonizes']) {
      const targets = record[type] || [];
      if (new Set(targets).size !== targets.length) {
        errors.push(`${lawName}.${type} contains duplicate references`);
      }
      for (const target of targets) {
        if (!LAW_NAMES.has(target)) errors.push(`${lawName}.${type} references unknown law ${target}`);
        if (target === lawName) errors.push(`${lawName}.${type} references itself`);
      }
    }
  }
  return errors;
}
