// ARP-8 (AC-39): priority laws for semantic sign-off (remediation plan §6.2).
//
// One entry per priority law: its test family, the behaviour it must show when
// enabled (and must NOT show when gated off), and the boundary it must hold.
// tests/unit/priorityLawSemantics.test.js runs one behaviour and one boundary
// test per entry using these exact names; scripts/generate-spec.mjs renders the
// matrix to docs/spec/audit/priority-law-matrix.md and the sign-off manifest
// carries one record per law. Descriptive only — never read by the solver.
export const PRIORITY_LAW_TEST_FILE = 'tests/unit/priorityLawSemantics.test.js';

const p = (law, family, behaviour, boundary) => Object.freeze({ law, family, behaviour, boundary });

export const PRIORITY_LAWS = Object.freeze([
  p('GRAV', 'force', 'pulls a two-body pair together; gated off it does nothing', 'stays finite for coincident particles'),
  p('CHARGE_LAW', 'force', 'opposite charges approach, like charges separate', 'neutral particles feel no force'),
  p('DRAG', 'force', 'reduces speed monotonically', 'never reverses velocity direction'),
  p('ELECTRIC_FIELD', 'force', 'drifts polarised particles along the field', 'leaves unpolarised particles unaccelerated'),
  p('LIFE', 'lifecycle', 'metabolism advances hunger and a starving particle dies', 'never touches a dead particle'),
  p('REPRO', 'lifecycle', 'mature, driven particles produce offspring', 'immature particles (age < 100) never reproduce'),
  p('SENESCENCE', 'lifecycle', 'old particles die over time', 'young particles (age ≤ 500) never die of age'),
  p('ENERGY', 'lifecycle', 'equalises energy between neighbours and conserves the total', 'equal-energy neighbours exchange nothing'),
  p('COLL', 'structural', 'separates overlapping particles', 'keeps speeds finite and bounded'),
  p('CONTACT', 'structural', 'pushes overlapping particles apart', 'leaves well-separated particles untouched'),
  p('BOND', 'structural', 'forms reciprocal bonds between near neighbours', 'never bonds a particle to itself or duplicates a partner'),
  p('MEMORY', 'information', 'accumulates memory in particles', 'keeps memory finite and non-negative'),
  p('SIGNAL_BOOST', 'information', 'relays signal from a signalling particle to a neighbour', 'silent particles (signal ≤ 0.01) relay nothing and signal stays ≤ 1'),
  p('LEARN', 'information', 'aligns neighbour velocities', 'leaves already-aligned particles aligned'),
  p('SUPERPOSITION', 'quantum', 'prepares superposed amplitudes', 'amplitudes stay finite and within [0, 1]'),
  p('WAVE_PARTICLE', 'quantum', 'a measured particle decays back to wave mode', 'an unmeasured isolated particle stays in wave mode'),
  p('ENTANGLEMENT', 'quantum', 'entangles neighbours with reciprocal links', 'isolated particles stay free'),
  p('OBSERVER', 'quantum', 'with WAVE_PARTICLE, high-memory observers measure neighbours', 'low-memory observers measure nothing'),
]);
