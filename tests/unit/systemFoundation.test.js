import { describe, expect, it } from 'vitest';
import {
  SYSTEM_FOUNDATION,
  SYSTEM_FOUNDATION_ORDER,
  getSystemFoundation,
  getSystemFoundationReport,
} from '../../src/state/systemFoundation.js';

describe('system foundation registry', () => {
  it('orders all documented systems from smallest to broadest implementation', () => {
    expect(SYSTEM_FOUNDATION_ORDER).toHaveLength(12);
    expect(SYSTEM_FOUNDATION_ORDER[0]).toBe('family-kinship');
    expect(SYSTEM_FOUNDATION_ORDER.at(-1)).toBe('species-lineage');
    expect(SYSTEM_FOUNDATION_ORDER.every((id, index) => SYSTEM_FOUNDATION[id].breadthRank === index + 1)).toBe(true);
  });

  it('marks Phase 1 complete without claiming missing ontology is implemented', () => {
    const family = getSystemFoundation('family-kinship');
    const ecology = getSystemFoundation('ecology');
    expect(family.phaseOne.status).toBe('complete');
    expect(family.evidence).toBe('scaffold');
    expect(ecology.evidence).toBe('implemented');
    expect(family.phaseOne.guarantees).toContain('no new particle-stride fields');
  });

  it('returns defensive report copies', () => {
    const report = getSystemFoundationReport();
    report[0].sourceAnchors.push('test');
    expect(getSystemFoundation('family-kinship').sourceAnchors).not.toContain('test');
  });
});
