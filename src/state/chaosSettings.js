import { DNA_COUNT, DNA_RANGES, DEFAULT_DNA_STRIDE, MAX_PARTICLES } from '../constants.js';
import { WORLD_PARAM_DEFS, clampWorldParam } from './worldParams.js';
import { writeDNAParam } from '../dna/codec.js';

/** Full Chaos samples physical settings, not renderer/compute budgets.
 * Population/space/time have explicit playable bounds, not full-range spikes.
 */
export function randomizeChaosSettings(world, dna, speciesCount, rng) {
  const bounds = {
    WORLD_SIZE: [400, 2400], PARTICLE_COUNT: [500, 3000], MAX_POP: [500, 3000], INITIAL_POP: [300, 1200],
    TIME_SPEED: [0.2, 1.5], SPAWN_RATE: [0, 20],
  };
  const worldParams = { ...world };
  for (const def of WORLD_PARAM_DEFS) {
    if (def.group === 'PERFORMANCE') continue;
    const [min, max] = bounds[def.key] || [def.min, def.max];
    const sampled = min + rng.next() * (max - min);
    worldParams[def.key] = clampWorldParam(def.key, def.min + Math.round((sampled - def.min) / def.step) * def.step);
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
