import { DNA_COUNT, DNA_RANGES, DEFAULT_DNA_STRIDE, MAX_PARTICLES, LAW_COUNT, LAW_INDEXES } from '../constants.js';
import { SplitMix32 } from '../core/prng.js';
import { WORLD_PARAM_DEFS, clampWorldParam } from './worldParams.js';
import { isSet } from './lawState.js';
import { writeDNAParam } from '../dna/codec.js';

/** Sample the slider's legal values uniformly, including a non-step-aligned
 * maximum (which the slider can reach at its endpoint).
 */
function sampleWorldParam(def, rng, min = def.min, max = def.max) {
  const precision = Math.max(0, (String(def.step).split('.')[1] || '').length);
  const round = (value) => Number(value.toFixed(precision));
  const firstIndex = Math.ceil((min - def.min) / def.step - 1e-9);
  const first = round(Math.max(min, def.min + firstIndex * def.step));
  const regularCount = Math.floor((max - first) / def.step + 1e-9) + 1;
  const last = round(first + (regularCount - 1) * def.step);
  const hasEndpoint = max === def.max && Math.abs(last - max) > 1e-9;
  const outcomeCount = regularCount + (hasEndpoint ? 1 : 0);
  const randomValue = Math.min(1 - Number.EPSILON, Math.max(0, rng.next()));
  const selected = Math.floor(randomValue * outcomeCount);
  return selected === regularCount ? max : round(first + selected * def.step);
}

/** Full Chaos samples physical settings, not renderer/compute budgets. */
export function randomizeChaosSettings(world, dna, speciesCount, rng) {
  const worldParams = { ...world };
  for (const def of WORLD_PARAM_DEFS) {
    if (def.group === 'PERFORMANCE') continue;
    const min = def.key === 'RECOVERY_THRESHOLD'
      ? Math.max(def.min, worldParams.EXTINCTION_THRESHOLD)
      : def.key === 'BOIL_TEMP_POINT'
        ? Math.max(def.min, worldParams.MELT_TEMP_POINT)
        : def.min;
    const max = def.key === 'MAX_POP'
      ? Math.min(def.max, worldParams.PARTICLE_COUNT)
      : def.max;
    worldParams[def.key] = clampWorldParam(def.key, sampleWorldParam(def, rng, min, max));
  }
  worldParams.MAX_POP = Math.min(MAX_PARTICLES, worldParams.PARTICLE_COUNT, worldParams.MAX_POP);
  worldParams.INITIAL_POP = Math.min(worldParams.INITIAL_POP, worldParams.MAX_POP);
  worldParams.RECOVERY_THRESHOLD = Math.max(worldParams.EXTINCTION_THRESHOLD, worldParams.RECOVERY_THRESHOLD);
  worldParams.BOIL_TEMP_POINT = Math.max(worldParams.MELT_TEMP_POINT, worldParams.BOIL_TEMP_POINT);
  const genome = dna.slice();
  for (let s = 0; s < Math.min(speciesCount, genome.length / DEFAULT_DNA_STRIDE); s++) {
    for (let p = 0; p < DNA_COUNT; p++) {
      const range = DNA_RANGES[p];
      writeDNAParam(genome, s, p, range.min + rng.next() * (range.max - range.min));
    }
  }
  const laws = [];
  for (let lawIndex = 0; lawIndex < LAW_COUNT; lawIndex += 1) {
    if (lawIndex === LAW_INDEXES.WRAP) continue;
    laws.push({ lawIndex, active: lawIndex === LAW_INDEXES.CONTACT || rng.next() < 0.5 });
  }
  return { worldParams, dna: genome, laws };
}

/** Deterministic selective-Chaos overrides for the chosen legal law bands. */
export function randomizeSelectiveChaos(categories, lawCategories, lawState, rng = new SplitMix32(0x51f15e)) {
  const selected = new Set(Array.isArray(categories) ? categories : []);
  const changes = [];
  for (const [categoryName, category] of Object.entries(lawCategories || {})) {
    if (!selected.has(categoryName)) continue;
    for (const lawIndex of category.laws || []) {
      if (lawIndex === LAW_INDEXES.WRAP || rng.next() < 0.3) continue;
      const active = typeof lawState === 'function' ? lawState(lawIndex) : isSet(lawState, lawIndex);
      changes.push({ lawIndex, active: !active });
    }
  }
  return changes;
}
