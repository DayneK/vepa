// Shared deterministic world harness for law-semantics tests (B6).
// Builds a small particle cloud, enables a chosen law set and steps solve()
// inside a fresh solver context so tests never share hidden state.
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext } from '../../src/physics/solver.js';

export { S, LAW_INDEXES, PARTICLE_STRIDE };

export function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * @param {object} o
 * @param {number} [o.n] particles
 * @param {number} [o.seed]
 * @param {number} [o.spread] cube edge of the cloud
 * @param {(view: Float32Array, base: number, i: number, r: () => number) => void} [o.init]
 */
export function makeWorld({ n = 60, seed = 7, spread = 40, worldSize = 2000, init } = {}) {
  const view = new Float32Array(n * PARTICLE_STRIDE);
  const r = lcg(seed);
  const c = worldSize / 2;
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = c + (r() - 0.5) * spread;
    view[b + S.POS_Y] = c + (r() - 0.5) * spread;
    view[b + S.POS_Z] = c + (r() - 0.5) * spread;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 70; view[b + S.RADIUS] = 0.7;
    view[b + S.TEMPERATURE] = 20; view[b + S.SPECIES_ID] = i % 3;
    for (let k = 1; k <= 6; k++) if (S[`BOND_PARTNER_${k}`] !== undefined) view[b + S[`BOND_PARTNER_${k}`]] = -1;
    if (init) init(view, b, i, r);
  }
  return { view, n, worldSize };
}

export function lawsOf(names) {
  const laws = createLawState();
  for (const name of names) {
    if (LAW_INDEXES[name] === undefined) throw new RangeError(`unknown law ${name}`);
    lawSet(laws, LAW_INDEXES[name]);
  }
  return laws;
}

export const ALL_LAWS = Object.keys(LAW_INDEXES);

/** Step `ticks` solves in a fresh solver context; returns the world. */
export function step(world, lawNames, ticks, { seed = 9, dt = 1 / 60, each } = {}) {
  const prev = enterSolverContext(createSolverContext());
  try {
    const laws = lawsOf(lawNames);
    const dna = createDNABuffer();
    loadDefaults(dna, DNA_RANGES);
    const prng = lcg(seed);
    for (let t = 0; t < ticks; t++) {
      solve(world.view, world.n, PARTICLE_STRIDE, laws, dna, world.worldSize, dt, prng);
      const born = drainOffspring();
      if (born.length) (world.offspring ||= []).push(...born);
      if (each) each(world, t);
    }
  } finally {
    enterSolverContext(prev);
  }
  return world;
}

export function field(world, name) {
  const out = new Float64Array(world.n);
  for (let i = 0; i < world.n; i++) out[i] = world.view[i * PARTICLE_STRIDE + S[name]];
  return out;
}
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const maxAbs = (a) => a.reduce((x, y) => Math.max(x, Math.abs(y)), 0);
