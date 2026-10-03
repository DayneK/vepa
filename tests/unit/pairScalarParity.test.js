// ARP-5 (AC-19): the solver's hot-loop pair scalars equal getPairGeometry()
// within 1e-9 on several fixtures, including a coincident pair, a toroidal
// wrap pair and the farthest pair the neighbour query hands the solver.
import { describe, it, expect, afterEach } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { runtimeConfig } from '../../src/state/runtimeConfig.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext } from '../../src/physics/solver.js';
import { getPairGeometry } from '../../src/physics/pairGeometry.js';

const W = 2000;
afterEach(() => { runtimeConfig.pairProbe = null; });

function world(points) {
  const view = new Float32Array(points.length * PARTICLE_STRIDE);
  points.forEach(([x, y, z, vx = 0, vy = 0, vz = 0, r = 0.7], i) => {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = x; view[b + S.POS_Y] = y; view[b + S.POS_Z] = z;
    view[b + S.VEL_X] = vx; view[b + S.VEL_Y] = vy; view[b + S.VEL_Z] = vz;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 60; view[b + S.RADIUS] = r; view[b + S.SPECIES_ID] = i % 2;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  });
  return view;
}

function probeRun(view, n) {
  const laws = createLawState();
  for (const name of ['GRAV', 'COLL', 'DRAG']) lawSet(laws, LAW_INDEXES[name]);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  const seen = [];
  let worst = 0;
  runtimeConfig.pairProbe = (kind, v, iBase, jBase, worldSize, s) => {
    const g = getPairGeometry(v, iBase, jBase, worldSize);
    const diffs = kind === 'pair'
      ? [s.dx - g.dx, s.dy - g.dy, s.dz - g.dz, s.distSq - g.distanceSquared, s.dist - g.distance]
      : [
          // Solver normal points i → j, relative velocity is v_i − v_j: the
          // along-normal component is the negation of getPairGeometry's.
          ...(s.invDist ? [s.nx - g.normalX, s.ny - g.normalY, s.nz - g.normalZ, s.relVelN + g.relativeVelocityAlongNormal] : []),
          s.relSpeed - g.relativeSpeed, s.overlap - g.overlap,
        ];
    for (const d of diffs) worst = Math.max(worst, Math.abs(d));
    seen.push({ kind, dist: g.distance, wrapped: Math.abs(v[jBase + S.POS_X] - v[iBase + S.POS_X]) > worldSize / 2 });
  };
  const prev = enterSolverContext(createSolverContext());
  try {
    let s = 3;
    solve(view, n, PARTICLE_STRIDE, laws, dna, W, 1 / 60, () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296));
    drainOffspring();
  } finally { enterSolverContext(prev); runtimeConfig.pairProbe = null; }
  return { seen, worst };
}

describe('solver pair scalars match getPairGeometry (ARP-5)', () => {
  it('fixture 1: a close colliding pair with relative velocity', () => {
    const { seen, worst } = probeRun(world([[1000, 1000, 1000, 1, 0, 0], [1001, 1000.3, 1000, -1, 0.5, 0]]), 2);
    expect(seen.some((p) => p.kind === 'pair')).toBe(true);
    expect(seen.some((p) => p.kind === 'contact')).toBe(true);
    expect(worst).toBeLessThanOrEqual(1e-9);
  });
  it('fixture 2: a toroidal wrap pair across the world boundary', () => {
    const { seen, worst } = probeRun(world([[0.5, 1000, 1000], [W - 0.4, 1000, 1000]]), 2);
    expect(seen.some((p) => p.kind === 'pair' && p.wrapped)).toBe(true);
    expect(worst).toBeLessThanOrEqual(1e-9);
  });
  it('fixture 3 (boundary): a coincident pair (distance 0)', () => {
    const { seen, worst } = probeRun(world([[1000, 1000, 1000, 0.5, 0, 0], [1000, 1000, 1000, -0.5, 0, 0]]), 2);
    expect(seen.some((p) => p.kind === 'pair' && p.dist === 0)).toBe(true);
    expect(worst).toBeLessThanOrEqual(1e-9);
  });
  it('fixture 4 (boundary): a 60-particle cloud, including the max-range neighbour pair', () => {
    let s = 77;
    const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    const pts = Array.from({ length: 60 }, () => [900 + r() * 400, 900 + r() * 400, 900 + r() * 400, r() - 0.5, r() - 0.5, r() - 0.5]);
    const { seen, worst } = probeRun(world(pts), pts.length);
    const pairs = seen.filter((p) => p.kind === 'pair');
    expect(pairs.length).toBeGreaterThan(100);
    const maxDist = Math.max(...pairs.map((p) => p.dist));
    expect(maxDist).toBeGreaterThan(100); // the farthest pair the grid query yields is covered
    expect(worst).toBeLessThanOrEqual(1e-9);
  });
});
