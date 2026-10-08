// PERF-2 (D-033): when a worker tick took at least a frame, main.js queues the
// next tick from the TICK_COMPLETE handler instead of idling until the next
// animation frame. The contract is that this is the same tick the render loop
// would request (same arguments) and that it never fires while paused, during
// multiplex, without a ready worker, or for fast ticks.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MAIN = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const fnBody = (name) => {
  const start = MAIN.indexOf(`function ${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  return MAIN.slice(start, MAIN.indexOf('\n}\n', start));
};

describe('worker tick requeue (PERF-2)', () => {
  it('handleWorkerTick requeues only after the tick is finished on the main thread', () => {
    const body = fnBody('handleWorkerTick');
    expect(body.indexOf('finishPhysicsTick(')).toBeGreaterThan(-1);
    expect(body.indexOf('requeueWorkerTickIfLate(')).toBeGreaterThan(body.indexOf('finishPhysicsTick('));
  });

  it('is guarded: paused, busy, no worker, multiplex, and fast ticks all skip it', () => {
    const body = fnBody('requeueWorkerTickIfLate');
    for (const guard of ['paused', 'workerBusy', '!physicsWorker', '!workerReady', 'workerFailed', 'multiplexController.isActive()', 'WORKER_REQUEUE_MIN_MS']) {
      expect(body, guard).toContain(guard);
    }
    expect(MAIN).toMatch(/const WORKER_REQUEUE_MIN_MS = 1000 \/ 60;/);
  });

  it('passes exactly the arguments the render loop passes', () => {
    const call = 'solve(particleView, particleCount, PARTICLE_STRIDE, lawState, dnaBuffer, worldSize, DT * runtimeConfig.simSpeed, rng)';
    expect(fnBody('requeueWorkerTickIfLate')).toContain(call);
    expect(fnBody('renderLoop')).toContain(call);
  });
});
