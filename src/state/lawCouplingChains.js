// LRA-5 (AC-33): chemistry / thermal / EM coupling chains made explicit.
//
// Each chain lists laws in causal order and the stride field that carries the
// effect from one step to the next. Declarations are descriptive (never read
// by the solver); tests/unit/lawCouplingChains.test.js checks every link
// against the ontology (upstream writes the field, downstream reads it) and
// exercises every chain end-to-end on a fixture: removing the upstream law
// must change the downstream observable.

export const LAW_COUPLING_CHAINS = Object.freeze([
  Object.freeze({
    id: 'thermal-agitation', domain: 'thermal',
    steps: Object.freeze([{ law: 'EXOTHERMIC', via: 'TEMPERATURE' }, { law: 'HEAT', via: 'VEL_X' }]),
    observe: 'VEL_X',
    story: 'Exothermic release raises temperature; HEAT turns temperature into thermal jitter.',
  }),
  Object.freeze({
    id: 'thermal-phase', domain: 'thermal→chemistry',
    steps: Object.freeze([{ law: 'EXOTHERMIC', via: 'TEMPERATURE' }, { law: 'BOIL', via: 'MASS' }]),
    observe: 'MASS',
    story: 'Released heat crosses the boiling threshold and BOIL sheds mass.',
  }),
  Object.freeze({
    id: 'thermal-ionisation', domain: 'thermal→EM',
    steps: Object.freeze([{ law: 'EXOTHERMIC', via: 'TEMPERATURE' }, { law: 'PLASMA', via: 'CHARGE' }]),
    observe: 'CHARGE',
    story: 'Hot matter becomes plasma and carries charge.',
  }),
  Object.freeze({
    id: 'spark-heating', domain: 'EM→thermal',
    steps: Object.freeze([{ law: 'DISCHARGE', via: 'TEMPERATURE' }, { law: 'HEAT', via: 'VEL_X' }]),
    observe: 'VEL_X',
    story: 'A discharge deposits heat that HEAT expresses as motion.',
  }),
  Object.freeze({
    id: 'plasma-heating', domain: 'EM→thermal',
    steps: Object.freeze([{ law: 'PLASMA', via: 'TEMPERATURE' }, { law: 'HEAT', via: 'VEL_X' }]),
    observe: 'VEL_X',
    story: 'Plasma heating drives thermal agitation.',
  }),
  Object.freeze({
    id: 'acid-charge-force', domain: 'chemistry→EM',
    steps: Object.freeze([{ law: 'ACIDITY', via: 'CHARGE' }, { law: 'CHARGE_LAW', via: 'VEL_X' }]),
    observe: 'VEL_X',
    story: 'Acidity shifts stored charge; Coulomb forces respond.',
  }),
]);

/** Ontology check: each link's upstream writes `via` and the next law reads it. */
export function validateCouplingChains(relationships, chains = LAW_COUPLING_CHAINS) {
  const errors = [];
  const has = (law, type, field) => (relationships[law]?.[type] || []).some((f) => f === field || String(f).split(/[\s/+]/)[0] === field);
  for (const c of chains) {
    for (let k = 0; k < c.steps.length - 1; k++) {
      const { law, via } = c.steps[k];
      const next = c.steps[k + 1].law;
      if (!relationships[law]) errors.push(`${c.id}: unknown law ${law}`);
      if (!has(law, 'writes', via)) errors.push(`${c.id}: ${law} does not declare writing ${via}`);
      if (!has(next, 'reads', via)) errors.push(`${c.id}: ${next} does not declare reading ${via}`);
    }
  }
  return errors;
}
