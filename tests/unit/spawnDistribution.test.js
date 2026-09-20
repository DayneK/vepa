import { describe, expect, it } from 'vitest';
import { createWorldParams } from '../../src/state/worldParams.js';
import { initialPopulationTarget, perSpeciesAllocation } from '../../src/spawn/distribution.js';

describe('zero-particle startup', () => {
  it('defaults the initial population to zero', () => {
    const params = createWorldParams();
    expect(params.INITIAL_POP).toBe(0);
    expect(initialPopulationTarget(params, { hardCap: 100000 })).toBe(0);
    expect(perSpeciesAllocation(0, 5)).toBe(0);
  });
});
