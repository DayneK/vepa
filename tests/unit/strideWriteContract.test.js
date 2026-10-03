// AUD-STC (AC-41): writer ownership per stride field; undeclared writes fail.
import { describe, it, expect } from 'vitest';
import { LAW_IMPLEMENTATIONS } from '../../src/state/lawImplementations.generated.js';
import { STRIDE_FIELD_WRITERS, checkStrideWriteContract } from '../../src/state/strideWriteContract.js';

describe('stride write contract (AUD-STC)', () => {
  it('every scanned law write is owned in the contract, and no owner is stale', () => {
    expect(checkStrideWriteContract(LAW_IMPLEMENTATIONS)).toEqual([]);
  });

  it('fails on an undeclared write (adversarial)', () => {
    const impl = { ...LAW_IMPLEMENTATIONS, GRAV: { ...LAW_IMPLEMENTATIONS.GRAV, writes: ['CHARGE'] } };
    expect(checkStrideWriteContract(impl)).toContain('undeclared write: GRAV -> CHARGE');
  });

  it('fails on unknown fields and stale owners', () => {
    const errs = checkStrideWriteContract(LAW_IMPLEMENTATIONS, { ...STRIDE_FIELD_WRITERS, NOT_A_FIELD: ['GRAV'] });
    expect(errs).toContain('contract names unknown stride field NOT_A_FIELD');
    expect(errs).toContain('stale owner: GRAV no longer writes NOT_A_FIELD');
  });
});
