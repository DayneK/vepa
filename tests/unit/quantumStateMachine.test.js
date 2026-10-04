// LRA-8 (AC-36): legal transitions of the existing quantum stride flags.
import { describe, it, expect } from 'vitest';
import { QUANTUM_TRANSITIONS, classifyQuantumState, illegalTransitions, entanglementInvariantErrors } from '../../src/physics/quantumStateMachine.js';
import { makeWorld, step, PARTICLE_STRIDE, S } from '../helpers/lawWorld.js';

const QUANTUM = ['SUPERPOSITION', 'WAVE_PARTICLE', 'OBSERVER', 'ENTANGLEMENT', 'TELEPORT', 'COLL', 'CONTACT', 'DECOHERENCE', 'COHERENCE'];

function observe(ticks = 200) {
  const w = makeWorld({ n: 40, spread: 10, init: (v, b, i, r) => { v[b + S.ENTANGLE_ID] = -1; v[b + S.MEMORY] = r(); v[b + S.ENERGY] = 80; v[b + S.VEL_X] = (r() - 0.5) * 2; } });
  let prev = Array.from({ length: w.n }, (_, i) => classifyQuantumState(w.view, i * PARTICLE_STRIDE));
  const seen = new Set(); const illegal = []; const invariant = [];
  step(w, QUANTUM, ticks, {
    each: (wd) => {
      for (let i = 0; i < wd.n; i++) {
        const cur = classifyQuantumState(wd.view, i * PARTICLE_STRIDE);
        for (const axis of Object.keys(cur)) if (cur[axis] !== prev[i][axis]) seen.add(`${axis}:${prev[i][axis]}>${cur[axis]}`);
        illegal.push(...illegalTransitions(prev[i], cur));
        prev[i] = cur;
      }
      invariant.push(...entanglementInvariantErrors(wd.view, wd.n, PARTICLE_STRIDE));
    },
  });
  return { seen, illegal, invariant };
}

describe('quantum state machine (LRA-8)', () => {
  const { seen, illegal, invariant } = observe();
  it('every observed transition is legal', () => expect(illegal).toEqual([]));
  it('entanglement links stay reciprocal', () => expect(invariant).toEqual([]));
  it('the live laws exercise the core transitions', () => {
    for (const t of ['amplitude:UNPREPARED>SUPERPOSED', 'amplitude:SUPERPOSED>COLLAPSED', 'mode:WAVE>PARTICLE', 'link:FREE>ENTANGLED']) {
      expect([...seen], t).toContain(t);
    }
  });
  it('a measured particle decays back to WAVE when nothing re-measures it', () => {
    const w = makeWorld({ n: 4, spread: 400, init: (v, b) => { v[b + S.WAVE_MEASURED] = 1; v[b + S.ENTANGLE_ID] = -1; } });
    expect(classifyQuantumState(w.view, 0).mode).toBe('PARTICLE');
    step(w, ['WAVE_PARTICLE'], 60);
    expect(classifyQuantumState(w.view, 0).mode).toBe('WAVE');
  });
  it('rejects transitions outside the machine (adversarial)', () => {
    expect(illegalTransitions({ amplitude: 'COLLAPSED', mode: 'WAVE', link: 'FREE' }, { amplitude: 'UNPREPARED', mode: 'WAVE', link: 'FREE' })).toEqual(['amplitude: COLLAPSED>UNPREPARED']);
    expect(QUANTUM_TRANSITIONS.link).toContain('ENTANGLED>FREE');
  });
});
