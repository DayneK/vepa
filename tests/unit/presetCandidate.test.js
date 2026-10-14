import { describe, expect, it } from 'vitest';
import { DEFAULT_DNA_STRIDE, LAW_INDEXES, MAX_SPECIES } from '../../src/constants.js';
import { preparePresetCandidate } from '../../src/state/presetCandidate.js';
import { WORLD_PARAM_DEFS } from '../../src/state/worldParams.js';

describe('preset candidate validation', () => {
  const validPreset = () => ({
    speciesCount: 2,
    dna: new Uint16Array(2 * DEFAULT_DNA_STRIDE),
    law: { low: 1, high: 0, ext: 0, quad: 0, penta: 0 },
    worldParams: { [WORLD_PARAM_DEFS[0].key]: WORLD_PARAM_DEFS[0].default },
  });

  it('prepares laws, world parameters and all species genomes as one validated candidate', () => {
    const candidate = preparePresetCandidate(validPreset());
    expect(candidate.speciesCount).toBe(2);
    expect(candidate.dna).toHaveLength(2 * DEFAULT_DNA_STRIDE);
    expect(candidate.lawChanges).toHaveLength(135);
    expect(candidate.lawChanges.some(({ lawIndex }) => lawIndex === LAW_INDEXES.WRAP)).toBe(false);
    expect(candidate.worldChanges).toHaveLength(1);
  });

  it('rejects malformed roster, law masks, WORLD fields and incomplete genomes', () => {
    const badCases = [
      { ...validPreset(), speciesCount: 0 },
      { ...validPreset(), speciesCount: MAX_SPECIES + 1 },
      { ...validPreset(), law: { low: '1' } },
      { ...validPreset(), worldParams: { NOT_A_WORLD_PARAMETER: 3 } },
      { ...validPreset(), worldParams: { [WORLD_PARAM_DEFS[0].key]: Infinity } },
      { ...validPreset(), dna: new Uint16Array(DEFAULT_DNA_STRIDE) },
      { ...validPreset(), dna: Object.assign({}, Array.from(validPreset().dna)) },
    ];
    for (const preset of badCases) expect(preparePresetCandidate(preset)).toBeNull();
  });

  it('rejects out-of-range genome entries and accepts a preset without genome data', () => {
    const malformed = validPreset();
    malformed.dna[0] = 65535;
    expect(preparePresetCandidate(malformed)).not.toBeNull();
    malformed.dna = new Int32Array(2 * DEFAULT_DNA_STRIDE);
    malformed.dna[0] = 65536;
    expect(preparePresetCandidate(malformed)).toBeNull();
    const withoutGenome = validPreset();
    withoutGenome.dna = null;
    expect(preparePresetCandidate(withoutGenome)).toMatchObject({ speciesCount: 2, dna: null });
  });
});
