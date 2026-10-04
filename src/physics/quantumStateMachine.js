// LRA-8 (AC-36): quantum state machine over the existing quantum stride flags.
//
// Documents (and lets tests check) the legal transitions the current quantum
// laws produce; it never changes physics and the solver does not import it.
//
//  amplitude (SUPER_AMP_1..4, SUPERPOSITION):
//    UNPREPARED --prepare--> SUPERPOSED --collapse (Born rule)--> COLLAPSED
//    COLLAPSED --collapse--> COLLAPSED (re-measure; eigenstate + ε re-spread)
//  mode (WAVE_MEASURED, WAVE_PARTICLE / collisions / OBSERVER):
//    WAVE --measure--> PARTICLE --decay (×0.95 per tick, < 0.1)--> WAVE
//  link (ENTANGLE_ID / ENTANGLE_PHASE, ENTANGLEMENT / TELEPORT):
//    FREE --entangle (contact)--> ENTANGLED --decohere | teleport | partner dead--> FREE
import { STRIDE_INDEXES as S } from '../constants.js';

export const QUANTUM_STATES = Object.freeze({
  amplitude: Object.freeze(['UNPREPARED', 'SUPERPOSED', 'COLLAPSED']),
  mode: Object.freeze(['WAVE', 'PARTICLE']),
  link: Object.freeze(['FREE', 'ENTANGLED']),
});

/** Legal transitions per axis ("A>B"); staying in a state is always legal. */
export const QUANTUM_TRANSITIONS = Object.freeze({
  amplitude: Object.freeze(['UNPREPARED>SUPERPOSED', 'SUPERPOSED>COLLAPSED', 'UNPREPARED>COLLAPSED']),
  mode: Object.freeze(['WAVE>PARTICLE', 'PARTICLE>WAVE']),
  link: Object.freeze(['FREE>ENTANGLED', 'ENTANGLED>FREE']),
});

const EPS_STATE = 1 - 3 * 0.05; // collapsed eigenstate amplitude written by SUPERPOSITION

/** Classify one particle on the three axes. */
export function classifyQuantumState(view, base) {
  const a = [S.SUPER_AMP_1, S.SUPER_AMP_2, S.SUPER_AMP_3, S.SUPER_AMP_4].map((k) => view[base + k] || 0);
  const norm2 = a.reduce((s, x) => s + x * x, 0);
  let amplitude = 'SUPERPOSED';
  if (norm2 <= 1e-6) amplitude = 'UNPREPARED';
  else if (a.some((x) => Math.abs(x - EPS_STATE) < 1e-6) && a.filter((x) => Math.abs(x - 0.05) < 1e-6).length === 3) amplitude = 'COLLAPSED';
  const mode = (view[base + S.WAVE_MEASURED] || 0) > 0.1 ? 'PARTICLE' : 'WAVE';
  const link = view[base + S.ENTANGLE_ID] >= 0 ? 'ENTANGLED' : 'FREE';
  return { amplitude, mode, link };
}

/** Illegal transitions between two classifications (empty when legal). */
export function illegalTransitions(before, after) {
  const out = [];
  for (const axis of Object.keys(QUANTUM_TRANSITIONS)) {
    if (before[axis] === after[axis]) continue;
    const t = `${before[axis]}>${after[axis]}`;
    if (!QUANTUM_TRANSITIONS[axis].includes(t)) out.push(`${axis}: ${t}`);
  }
  return out;
}

/** Entanglement links must be symmetric (i↔j) — the pairing invariant. */
export function entanglementInvariantErrors(view, n, stride) {
  const errors = [];
  for (let i = 0; i < n; i++) {
    const j = view[i * stride + S.ENTANGLE_ID];
    if (j < 0) continue;
    if (j >= n || view[j * stride + S.ENTANGLE_ID] !== i) errors.push(`particle ${i} -> ${j} is not reciprocated`);
  }
  return errors;
}
