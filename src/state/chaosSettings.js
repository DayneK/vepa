import { DNA_COUNT, DNA_RANGES, DEFAULT_DNA_STRIDE, MAX_PARTICLES } from '../constants.js';
import { WORLD_PARAM_DEFS, clampWorldParam } from './worldParams.js';
import { writeDNAParam } from '../dna/codec.js';

/** Full Chaos samples physical settings, not renderer/compute budgets.
 * Population/space/time have explicit playable bounds, not full-range spikes.
 */
export function randomizeChaosSettings(world, dna, speciesCount, rng) {
  const bounds = {
    // Chaos-only sampling intervals; DNA_RANGES and WORLD_PARAM_DEFS stay unchanged.
    // The upper bounds for space/population are each reduced by 10×.
    WORLD_SIZE: [50, 240], PARTICLE_COUNT: [100, 300], MAX_POP: [100, 300], INITIAL_POP: [30, 120],
    TIME_SPEED: [0.2, 1.5], SPAWN_RATE: [0, 20],
  };
  // A 100-unit WORLD_SIZE slider step would collapse this narrow interval to
  // only three outcomes. Chaos keeps its own finer size granularity.
  const samplingSteps = { WORLD_SIZE: 10 };
  const worldParams = { ...world };
  for (const def of WORLD_PARAM_DEFS) {
    if (def.group === 'PERFORMANCE') continue;
    const [min, max] = bounds[def.key] || [def.min, def.max];
    const sampled = min + rng.next() * (max - min);
    const step = samplingSteps[def.key] || def.step;
    const stepped = (samplingSteps[def.key] ? min : def.min)
      + Math.round((sampled - (samplingSteps[def.key] ? min : def.min)) / step) * step;
    worldParams[def.key] = clampWorldParam(def.key, Math.min(max, Math.max(min, stepped)));
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
  return { worldParams, dna: genome };
}
