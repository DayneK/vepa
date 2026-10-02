// CG-2: every law has non-empty hint, explanation and system help tiers, and
// either a non-empty advanced tier or an explicit entry in
// ADVANCED_HELP_EXCEPTIONS.
import { describe, it, expect } from 'vitest';
import { LAW_INDEXES } from '../../src/constants/laws.js';
import { LAW_HELP_DB, ADVANCED_HELP_EXCEPTIONS } from '../../src/constants/help.js';

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

describe('help tier contract (CG-2)', () => {
  const names = Object.keys(LAW_INDEXES);
  it.each(names)('%s has hint, explanation and system', (name) => {
    const h = LAW_HELP_DB[name];
    expect(h, name).toBeTruthy();
    for (const tier of ['hint', 'explanation', 'system']) expect(filled(h[tier]), `${name}.${tier}`).toBe(true);
  });
  it('every law has an advanced tier or an explicit exception', () => {
    const exc = new Set(ADVANCED_HELP_EXCEPTIONS);
    const missing = names.filter((n) => !filled(LAW_HELP_DB[n]?.advanced) && !exc.has(n));
    expect(missing).toEqual([]);
  });
  it('the exception list only names real laws that still lack advanced text', () => {
    for (const n of ADVANCED_HELP_EXCEPTIONS) {
      expect(LAW_INDEXES[n], n).toBeDefined();
      expect(filled(LAW_HELP_DB[n].advanced), `${n} has advanced text now; remove it from ADVANCED_HELP_EXCEPTIONS`).toBe(false);
    }
    expect(new Set(ADVANCED_HELP_EXCEPTIONS).size).toBe(ADVANCED_HELP_EXCEPTIONS.length);
  });
});
