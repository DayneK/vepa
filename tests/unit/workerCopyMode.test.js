// PERF-1: without SharedArrayBuffer (no cross-origin isolation: GitHub Pages,
// plain static servers) the physics worker runs in copy mode — each TICK
// carries the live particle slice and TICK_COMPLETE transfers it back — so the
// main thread no longer solves physics itself.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { serialize as serializeLawState } from '../../src/state/lawState.js';

const posted = [];
let handler;
beforeAll(async () => {
  globalThis.self = { postMessage: (msg, transfer) => posted.push({ msg, transfer }) };
  await import('../../src/worker/physics.worker.js');
  handler = globalThis.self.onmessage;
});

const until = async (type) => {
  for (let k = 0; k < 200; k++) {
    const hit = posted.find((p) => p.msg.type === type);
    // A real main thread receives replies as macrotasks; mirror that so the
    // worker's single-flight flag has cleared before the next TICK.
    if (hit) { posted.splice(posted.indexOf(hit), 1); await new Promise((r) => setTimeout(r, 0)); return hit; }
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`no ${type}: ${JSON.stringify(posted.map((p) => p.msg.type + (p.msg.error ? ":" + p.msg.error : "")))}`);
};

describe('physics worker copy mode (PERF-1)', () => {
  it('solves a transferred ArrayBuffer slice and transfers it back', async () => {
    const n = 40;
    const view = new Float32Array(n * PARTICLE_STRIDE);
    for (let i = 0; i < n; i++) {
      const b = i * PARTICLE_STRIDE;
      view[b + S.POS_X] = 500 + i * 3; view[b + S.POS_Y] = 500 + (i % 5) * 3; view[b + S.POS_Z] = 500;
      view[b + S.MASS] = 1; view[b + S.RADIUS] = 0.7; view[b + S.ENERGY] = 50;
      for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
    }
    const laws = createLawState(); lawSet(laws, LAW_INDEXES.GRAV);
    const config = { particleCount: n, worldSize: 1000, stride: PARTICLE_STRIDE, dt: 1 / 60, seed: 7, computeEngine: 'cpu', lawState: serializeLawState(laws) };
    handler({ data: { type: 'INIT', buffer: view.slice().buffer, count: n, config } });
    const init = await until('INIT_COMPLETE');
    expect(init.msg.hasSharedArrayBuffer).toBe(false);

    for (let t = 0; t < 3; t++) {
      const slice = view.slice(0, n * PARTICLE_STRIDE).buffer;
      handler({ data: { type: 'TICK', particleCount: n, dt: 1 / 60, buffer: slice } });
      const done = await until('TICK_COMPLETE');
      expect(done.msg.buffer).toBeInstanceOf(ArrayBuffer);
      expect(done.transfer).toEqual([done.msg.buffer]);
      expect(done.msg.buffer.byteLength).toBe(n * PARTICLE_STRIDE * 4);
      view.set(new Float32Array(done.msg.buffer));
      expect(done.msg.tickCount).toBe(t + 1);
    }
    // gravity moved particles toward each other
    expect(view[S.VEL_X]).toBeGreaterThan(0);
  });

  it('main.js uses the worker without SharedArrayBuffer and adopts the returned slice', () => {
    const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
    expect(main).toContain('return particleBuffer instanceof ArrayBuffer;');
    expect(main).toMatch(/type: 'TICK', particleCount: args\[1\], dt: args\[6\] \|\| DT, buffer \}, \[buffer\]/);
    expect(main).toContain('particleView.set(solved.length <= particleView.length');
  });
});
