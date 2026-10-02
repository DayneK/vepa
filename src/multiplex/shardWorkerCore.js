// ============================================================================
// Chaos Multiplex shard worker core (MX-20 worker pool, AC-95/AC-97).
//
// Pure message handler shared by the browser worker (shardWorker.js) and the
// Node bench/test adapter. Each sim keeps its own solver context here, so sims
// hosted by one worker never share field, HISTORY or clock state.
//
// tick message:
//   { type: 'tick', seq, key, epoch, count, view: ArrayBuffer (count × stride
//     floats, transferred), dna: Uint16Array, laws: [lo, hi, ext, quad, penta],
//     prngState, worldParams, runtime, worldSize, subDt, substeps }
// reply:
//   { type: 'ticked', seq, key, epoch, view (transferred back), dna, prngState,
//     offspring, ms }
// ============================================================================
import { PARTICLE_STRIDE } from '../constants.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext } from '../physics/solver.js';
import { createLawState } from '../state/lawState.js';
import { runtimeConfig } from '../state/runtimeConfig.js';
import { SplitMix32 } from '../core/prng.js';

const RUNTIME_KEYS = ['gravEngine', 'gravTheta', 'fieldAdvanceOnce', 'starMass'];
const sims = new Map(); // key → { epoch, ctx, laws, prng }

function simFor(key, epoch) {
  let s = sims.get(key);
  if (!s || s.epoch !== epoch) {
    // A rebuilt sim (new epoch) starts from a fresh solver context.
    s = { epoch, ctx: createSolverContext(), laws: createLawState(), prng: new SplitMix32(0) };
    sims.set(key, s);
  }
  return s;
}

/** Handle one message; returns { reply, transfer } or null. */
export function handleShardMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.type === 'drop') { sims.delete(msg.key); return null; }
  if (msg.type === 'ping') return { reply: { type: 'pong' }, transfer: [] };
  if (msg.type !== 'tick') return null;
  const t0 = performance.now();
  const s = simFor(msg.key, msg.epoch);
  // Solve on a persistent per-sim buffer: some law state (HISTORY) is keyed on
  // buffer identity, exactly as it is for the in-thread path.
  const incoming = new Float32Array(msg.view);
  const need = Math.max(incoming.length, (msg.capacity | 0) * PARTICLE_STRIDE);
  if (!s.view || s.view.length < need) s.view = new Float32Array(need);
  const view = s.view;
  view.fill(0);
  view.set(incoming);
  const w = msg.laws || [];
  s.laws.lowFlags[0] = w[0] | 0; s.laws.highFlags[0] = w[1] | 0; s.laws.extFlags[0] = w[2] | 0;
  s.laws.quadFlags[0] = w[3] | 0; s.laws.pentaFlags[0] = w[4] | 0;
  s.prng.state = msg.prngState | 0;
  const dna = msg.dna;
  if (msg.runtime) for (const k of RUNTIME_KEYS) if (msg.runtime[k] !== undefined) runtimeConfig[k] = msg.runtime[k];
  const savedWP = runtimeConfig.worldParams;
  if (msg.worldParams) runtimeConfig.worldParams = msg.worldParams;
  const prev = enterSolverContext(s.ctx);
  let offspring;
  try {
    const substeps = Math.max(1, msg.substeps | 0);
    for (let k = 0; k < substeps; k++) {
      solve(view, msg.count, PARTICLE_STRIDE, s.laws, dna, msg.worldSize, msg.subDt, () => s.prng.next());
    }
    offspring = drainOffspring().map((o) => ({ ...o, dna: o.dna ? Array.from(o.dna) : o.dna }));
  } finally {
    enterSolverContext(prev);
    runtimeConfig.worldParams = savedWP;
  }
  incoming.set(view.subarray(0, incoming.length));
  return {
    reply: {
      type: 'ticked', seq: msg.seq, key: msg.key, epoch: msg.epoch,
      view: msg.view, dna, prngState: s.prng.state | 0, offspring, ms: performance.now() - t0,
    },
    transfer: [msg.view],
  };
}

/** Number of sims currently hosted (tests/diagnostics). */
export function hostedSimCount() { return sims.size; }
