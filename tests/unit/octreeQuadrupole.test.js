// FSM-QUAD (AC-21): octree useQuadrupole:true is exercised and its measured
// error against direct summation is pinned at two scales. Finding: on these
// fixtures the quadrupole correction does NOT reduce error versus monopole
// (the header's "~10× more accurate" claim does not hold); this test pins the
// measured values so any change is visible. Also: the octree grows past its
// initial capacity (the "fixed at first creation" concern does not apply).
import { describe, it, expect } from 'vitest';
import { createOctree, buildOctree, octreeGravity } from '../../src/physics/octree.js';

const STRIDE = 100, WS = 200;
function cloud(N, seed) {
  let s = seed;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const b = new Float32Array(N * STRIDE);
  for (let i = 0; i < N; i++) { const o = i * STRIDE; b[o] = r() * WS; b[o + 1] = r() * WS; b[o + 2] = r() * WS; b[o + 6] = 0.5 + r() * 2; }
  return b;
}
function brute(buf, N, px, py, pz, self) {
  let ax = 0, ay = 0, az = 0;
  for (let j = 0; j < N; j++) {
    if (j === self) continue;
    const b = j * STRIDE, h = WS / 2;
    let rx = px - buf[b], ry = py - buf[b + 1], rz = pz - buf[b + 2];
    if (rx > h) rx -= WS; else if (rx < -h) rx += WS;
    if (ry > h) ry -= WS; else if (ry < -h) ry += WS;
    if (rz > h) rz -= WS; else if (rz < -h) rz += WS;
    const inv = 1 / Math.sqrt(rx * rx + ry * ry + rz * rz + 0.5);
    const f = buf[b + 6] * inv * inv * inv;
    ax -= f * rx; ay -= f * ry; az -= f * rz;
  }
  return [ax, ay, az];
}
function rms(N, quad, theta = 0.5, tree = createOctree(N)) {
  const buf = cloud(N, 99);
  buildOctree(tree, buf, STRIDE, N, WS);
  tree.useQuadrupole = quad;
  let num = 0, den = 0;
  const out = { ax: 0, ay: 0, az: 0 };
  for (let i = 0; i < N; i += Math.max(1, (N / 128) | 0)) {
    const b = i * STRIDE;
    out.ax = out.ay = out.az = 0;
    octreeGravity(tree, buf[b], buf[b + 1], buf[b + 2], 1, theta, out, i);
    const [x, y, z] = brute(buf, N, buf[b], buf[b + 1], buf[b + 2], i);
    num += (out.ax - x) ** 2 + (out.ay - y) ** 2 + (out.az - z) ** 2;
    den += x * x + y * y + z * z;
  }
  return Math.sqrt(num / den);
}

describe('octree quadrupole path (FSM-QUAD)', () => {
  it.each([[256, 0.0317], [1024, 0.0329]])('N = %i: quadrupole rms error pinned at %f (θ 0.5)', (N, pinned) => {
    const q = rms(N, true), m = rms(N, false);
    expect(q).toBeCloseTo(pinned, 3);
    expect(q).not.toBe(m); // the quadrupole kernel really runs
    expect(Math.abs(q - m)).toBeLessThan(0.002); // and currently gives no material gain
  });
  it('the tree grows beyond its initial capacity and stays exact at θ = 0', () => {
    const small = createOctree(16);
    const eSmall = rms(3000, false, 0, small);
    expect(small.nCap).toBeGreaterThan(32);
    expect(eSmall).toBeLessThan(1e-9);
  });
});
