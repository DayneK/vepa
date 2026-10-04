// LRA-5 (AC-33): every declared coupling chain is valid in the ontology and is
// exercised end-to-end: removing the upstream law changes the downstream observable.
import { describe, it, expect } from 'vitest';
import { LAW_RELATIONSHIPS, LAW_COUPLING_CHAINS, validateCouplingChains } from '../../src/state/lawOntology.js';
import { makeWorld, step, field, S } from '../helpers/lawWorld.js';

const init = (v, b, i, r) => { v[b + S.CHARGE] = (i % 2 ? 1 : -1) * r(); v[b + S.TEMPERATURE] = 20 + r() * 60; };
const run = (laws, observe) => field(step(makeWorld({ n: 60, spread: 25, init }), laws, 60), observe);
const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);

describe('coupling chains (LRA-5)', () => {
  it('declares chemistry, thermal and EM chains and validates them against the ontology', () => {
    const domains = LAW_COUPLING_CHAINS.map((c) => c.domain).join(' ');
    for (const d of ['thermal', 'chemistry', 'EM']) expect(domains).toContain(d);
    expect(validateCouplingChains(LAW_RELATIONSHIPS)).toEqual([]);
  });

  it('rejects a link whose upstream never writes the carrier field (adversarial)', () => {
    const bad = [{ id: 'bad', steps: [{ law: 'GRAV', via: 'TEMPERATURE' }, { law: 'HEAT', via: 'VEL_X' }] }];
    expect(validateCouplingChains(LAW_RELATIONSHIPS, bad)[0]).toMatch(/GRAV does not declare writing TEMPERATURE/);
  });

  for (const chain of LAW_COUPLING_CHAINS) {
    it(`${chain.id}: ${chain.steps.map((s) => s.law).join(' → ')} changes ${chain.observe} end-to-end`, () => {
      const laws = chain.steps.map((s) => s.law);
      const full = run(laws, chain.observe);
      const withoutUpstream = run(laws.slice(1), chain.observe);
      expect(full.every(Number.isFinite)).toBe(true);
      expect(l1(full, withoutUpstream)).toBeGreaterThan(1e-3);
    });
  }
});
