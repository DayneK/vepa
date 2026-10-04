// LRA-3 (AC-31): state/resource accounting budgets.
//
// A "budgeted" stride field is a conserved-or-accounted resource. Every law
// whose implementation writes one must declare that write in the ontology
// (`writes`), so resource flows are reviewable. The cross-check compares the
// ontology against the generated static scan (lawImplementations.generated.js).
// Descriptive only: nothing here is consumed by the solver.

export const BUDGETED_FIELDS = Object.freeze([
  'ENERGY', 'TEMPERATURE', 'MASS', 'SIGNAL', 'MEMORY', 'BOND_COUNT', 'ENTANGLE_ID', 'ENTANGLE_PHASE',
]);

/**
 * Declared budget writes the static scan cannot observe. Each entry needs a
 * reason; an entry that stops being needed (scan now sees it, or the
 * declaration was removed) is itself an error so the list cannot go stale.
 * `review: true` marks declarations the code does not appear to honour; they
 * are kept as declared pending a semantic review (no metadata is silently
 * dropped).
 */
export const BUDGET_DECLARATION_EXCEPTIONS = Object.freeze({
  ENERGY: Object.freeze({ ENERGY: { reason: 'applyEnergyTransfer writes through ENERGY_CHANNELS (indirect index, includes S.ENERGY).' } }),
  HEAT: Object.freeze({ TEMPERATURE: { reason: 'Written by applyHeatTransfer (shared HEAT/COLD function, laws.js); the scan records one implementer (applyThermalJitter).' } }),
  ACCR: Object.freeze({ BOND_COUNT: { reason: 'ACCR link bookkeeping in solver/laws helpers outside the scanned inline block.' } }),
});

/**
 * @param {Record<string, {writes?: string[]}>} relationships ontology records
 * @param {Record<string, {writes: string[]}>} implementations static-scan records
 * @param {object} [exceptions]
 * @returns {string[]} errors
 */
export function checkBudgetDeclarations(relationships, implementations, exceptions = BUDGET_DECLARATION_EXCEPTIONS) {
  const errors = [];
  const budget = new Set(BUDGETED_FIELDS);
  for (const [law, impl] of Object.entries(implementations)) {
    const declared = new Set(relationships[law]?.writes || []);
    for (const field of impl.writes) {
      if (budget.has(field) && !declared.has(field)) errors.push(`${law} writes budgeted ${field} but does not declare it`);
    }
    const scanned = new Set(impl.writes);
    for (const field of declared) {
      if (!budget.has(field) || scanned.has(field)) continue;
      if (!exceptions[law]?.[field]) errors.push(`${law} declares budgeted ${field} but the scan never sees it write (add an exception with a reason, or fix the declaration)`);
    }
  }
  for (const [law, fields] of Object.entries(exceptions)) {
    for (const field of Object.keys(fields)) {
      const declared = (relationships[law]?.writes || []).includes(field);
      const scanned = (implementations[law]?.writes || []).includes(field);
      if (!declared || scanned) errors.push(`stale budget exception ${law}.${field}`);
    }
  }
  return errors;
}

/** Per-law budget summary: budgeted fields each law declares it writes. */
export function lawResourceBudgets(relationships) {
  const budget = new Set(BUDGETED_FIELDS);
  return Object.fromEntries(Object.entries(relationships)
    .map(([law, r]) => [law, (r.writes || []).filter((f) => budget.has(f))])
    .filter(([, fields]) => fields.length));
}
