import { DEFAULT_DNA_STRIDE, LAW_COUNT, LAW_INDEXES, MAX_SPECIES } from '../constants.js';
import { deserialize, isSet } from './lawState.js';
import { WORLD_PARAM_DEFS } from './worldParams.js';

const LAW_WORDS = ['low', 'high', 'ext', 'quad', 'penta'];
const WORLD_KEYS = new Set(WORLD_PARAM_DEFS.map(({ key }) => key));

/** Validate and normalize an entire stored preset before any proposal is replaced. */
export function preparePresetCandidate(preset) {
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) return null;
  const speciesCount = preset.speciesCount;
  if (!Number.isInteger(speciesCount) || speciesCount < 1 || speciesCount > MAX_SPECIES) return null;

  const worldParams = preset.worldParams ?? {};
  if (!worldParams || typeof worldParams !== 'object' || Array.isArray(worldParams)
    || Object.entries(worldParams).some(([key, value]) => !WORLD_KEYS.has(key)
      || typeof value !== 'number' || !Number.isFinite(value))) return null;

  const laws = preset.law ?? { low: 0, high: 0, ext: 0, quad: 0, penta: 0 };
  if (!laws || typeof laws !== 'object' || Array.isArray(laws)
    || LAW_WORDS.some((word) => laws[word] !== undefined
      && (!Number.isInteger(laws[word]) || laws[word] < -2147483648 || laws[word] > 4294967295))) return null;

  const dna = preset.dna ?? null;
  if (dna !== null) {
    const supportedGenome = Array.isArray(dna)
      || (ArrayBuffer.isView(dna) && !(dna instanceof DataView));
    if (!supportedGenome || dna.length < speciesCount * DEFAULT_DNA_STRIDE) return null;
    for (let index = 0; index < speciesCount * DEFAULT_DNA_STRIDE; index += 1) {
      const value = dna[index];
      if (!Number.isInteger(value) || value < 0 || value > 65535) return null;
    }
  }

  const lawState = deserialize(laws);
  const lawChanges = Array.from({ length: LAW_COUNT }, (_, lawIndex) => ({
    lawIndex,
    active: isSet(lawState, lawIndex),
  })).filter(({ lawIndex }) => lawIndex !== LAW_INDEXES.WRAP);

  return {
    speciesCount,
    dna,
    lawChanges,
    worldChanges: Object.entries(worldParams).map(([key, value]) => ({ key, value })),
  };
}
