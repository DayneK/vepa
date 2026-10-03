// LRA-3 (AC-31): every law writing a budgeted stride field declares it.
import { describe, it, expect } from 'vitest';
import { LAW_RELATIONSHIPS } from '../../src/state/lawOntology.js';
import { LAW_IMPLEMENTATIONS } from '../../src/state/lawImplementations.generated.js';
import { checkBudgetDeclarations, lawResourceBudgets, BUDGETED_FIELDS } from '../../src/state/stateBudgets.js';

describe('state/resource budgets (LRA-3)', () => {
  it('ontology declarations match budgeted writes found in code', () => {
    expect(checkBudgetDeclarations(LAW_RELATIONSHIPS, LAW_IMPLEMENTATIONS)).toEqual([]);
  });

  it('catches an undeclared budgeted write (adversarial)', () => {
    const impl = { ...LAW_IMPLEMENTATIONS, GRAV: { ...LAW_IMPLEMENTATIONS.GRAV, writes: ['ENERGY'] } };
    expect(checkBudgetDeclarations(LAW_RELATIONSHIPS, impl)).toContain('GRAV writes budgeted ENERGY but does not declare it');
  });

  it('catches a declared budget field the law never writes (adversarial)', () => {
    const rel = { ...LAW_RELATIONSHIPS, COLL: { ...LAW_RELATIONSHIPS.COLL, writes: ['VEL_X', 'MASS'] } };
    expect(checkBudgetDeclarations(rel, LAW_IMPLEMENTATIONS)[0]).toMatch(/^COLL declares budgeted MASS/);
  });

  it('flags stale exceptions', () => {
    const errs = checkBudgetDeclarations(LAW_RELATIONSHIPS, LAW_IMPLEMENTATIONS, { GRAV: { MASS: { reason: 'x' } } });
    expect(errs).toContain('stale budget exception GRAV.MASS');
  });

  it('summarises per-law budgets over the canonical budget fields', () => {
    const budgets = lawResourceBudgets(LAW_RELATIONSHIPS);
    expect(budgets.TELEPORT).toEqual(expect.arrayContaining(['ENERGY', 'ENTANGLE_ID', 'ENTANGLE_PHASE']));
    for (const fields of Object.values(budgets)) for (const f of fields) expect(BUDGETED_FIELDS).toContain(f);
  });
});
