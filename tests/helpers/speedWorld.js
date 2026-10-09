// D-034: small seeded TIDAL_BLOOM world for the speed-option tests.
import { createHash } from 'node:crypto';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, DNA_RANGES, LAW_INDEXES } from '../../src/constants.js';
import { createLawState, set as setLaw } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults, setDNAFloat, getDNAFloat } from '../../src/dna/dnaBuffer.js';
import { solve, drainOffspring, resetOffspringRing, resetSolverState } from '../../src/physics/solver.js';
import { TIDAL_BLOOM } from '../../src/state/defaultPresets.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import { createWorldParams, syncWrapLaw } from '../../src/state/worldParams.js';

function splitmix(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0; let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}

/**
 * Run `ticks` solver ticks on a seeded world and return a hash of the final
 * buffer plus summary counts. `params` patches the world params; `spread`
 * is the cube side the particles start in (small = crowded).
 */
export function runSpeedWorld({ count = 400, ticks = 6, seed = 7, params = {}, spread = 120, worldSize = 2000, laws = TIDAL_BLOOM.laws, probe = null } = {}) {
  const rng = splitmix(seed);
  const mathRng = splitmix(seed ^ 0x5bd1e995);
  const savedRandom = Math.random; Math.random = () => mathRng();
  const savedParams = runtimeConfig.worldParams; const savedProbe = runtimeConfig.pairProbe;
  try {
    runtimeConfig.worldParams = { ...createWorldParams(), ...(TIDAL_BLOOM.worldParams || {}), ...params };
    runtimeConfig.pairProbe = probe;
    resetOffspringRing(); resetSolverState(0);
    const view = new Float32Array(count * 2 * PARTICLE_STRIDE);
    const dna = createDNABuffer(); loadDefaults(dna, DNA_RANGES);
    for (let sp = 0; sp < 5; sp++) for (let d = 0; d < 42; d++) {
      const r = DNA_RANGES[d] || { min: -1, max: 1 };
      setDNAFloat(dna, sp, d, r.min + rng() * (r.max - r.min), r.min, r.max);
    }
    const c0 = worldSize / 2 - spread / 2;
    for (let i = 0; i < count; i++) {
      const b = i * PARTICLE_STRIDE, sp = i % 5;
      view[b + S.POS_X] = c0 + rng() * spread; view[b + S.POS_Y] = c0 + rng() * spread; view[b + S.POS_Z] = c0 + rng() * spread;
      view[b + S.MASS] = 1 + rng(); view[b + S.SPECIES_ID] = sp; view[b + S.ENERGY] = 50 + rng() * 50; view[b + S.RADIUS] = 0.6 + rng() * 0.6;
      view[b + S.BOND_PARTNER_1] = -1; view[b + S.BOND_PARTNER_2] = -1; view[b + S.BOND_PARTNER_3] = -1; view[b + S.BOND_PARTNER_4] = -1;
      for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, sp, d, r.min, r.max); }
    }
    const lawState = createLawState();
    for (const n of laws) if (LAW_INDEXES[n] !== undefined) setLaw(lawState, LAW_INDEXES[n]);
    syncWrapLaw(runtimeConfig.worldParams, lawState);
    const prng = splitmix(seed * 31);
    const h = createHash('sha256');
    for (let t = 0; t < ticks; t++) {
      solve(view, count, PARTICLE_STRIDE, lawState, dna, worldSize, 1 / 60, prng);
      for (const o of drainOffspring()) h.update(JSON.stringify(o));
    }
    h.update(Buffer.from(view.buffer));
    return { hash: h.digest('hex'), view };
  } finally {
    Math.random = savedRandom; runtimeConfig.worldParams = savedParams; runtimeConfig.pairProbe = savedProbe;
  }
}
