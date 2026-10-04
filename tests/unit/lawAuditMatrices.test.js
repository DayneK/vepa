// AUD-CONS (AC-40): generated conservation + non-redundancy matrices cover all laws.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LAW_INDEXES } from '../../src/constants.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../../docs/spec/audit/${f}`, import.meta.url), 'utf8'));
const LAWS = Object.keys(LAW_INDEXES).sort();

describe('law audit matrices (AUD-CONS)', () => {
  it('conservation matrix covers every law with a kept/changed cell per quantity', () => {
    const m = load('conservation-matrix.json');
    expect(m.laws.map((r) => r.law).sort()).toEqual(LAWS);
    for (const r of m.laws) {
      expect(r.finite).toBe(true);
      for (const q of m.quantities) expect(['kept', 'changed']).toContain(r.cells[q]);
    }
  });
  it('known sources change the totals they should (sanity)', () => {
    const by = Object.fromEntries(load('conservation-matrix.json').laws.map((r) => [r.law, r.cells]));
    expect(by.GRAV.momentum).toBe('changed');
    expect(by.HEAT.energy === 'changed' || by.HEAT.momentum === 'changed').toBe(true);
  });
  it('non-redundancy matrix covers every law with a known status', () => {
    const m = load('non-redundancy-matrix.json');
    expect(m.laws.map((r) => r.law).sort()).toEqual(LAWS);
    for (const r of m.laws) expect(['distinct', 'no-solo-effect', 'indistinguishable']).toContain(r.status);
    expect(m.laws.filter((r) => r.status === 'distinct').length).toBeGreaterThan(LAWS.length / 2);
  });
});
