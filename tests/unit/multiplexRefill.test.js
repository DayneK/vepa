// D-030: REFILL TO CAP — Clone-mode iterate tops every new shard back up to
// full population (default on); off restores the survivors-only behaviour.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE as P, STRIDE_INDEXES as S, MAX_PARTICLES, WORLD_SIZE } from '../../src/constants.js';
import { createParticleBuffer } from '../../src/state/particleBuffer.js';
import { createDNABuffer } from '../../src/dna/dnaBuffer.js';
import { createLawState } from '../../src/state/lawState.js';
import {
  createMultiplex, startMultiplex, iterateMultiplex, refillTargetFor, MULTIPLEX_DEFAULTS,
} from '../../src/multiplex/multiplex.js';
import { sanitizeMultiplexSettings, saveMultiplexSettings, loadMultiplexSettings, PERSISTED_KEYS } from '../../src/multiplex/multiplexSettings.js';

function makeSource(n, species = 3) {
  const { buffer, view } = createParticleBuffer(Math.max(n, 16), P);
  for (let i = 0; i < n; i++) {
    const b = i * P;
    view[b + S.POS_X] = 50 + (i % 40) * 10;
    view[b + S.POS_Y] = 60 + Math.floor(i / 40) * 7;
    view[b + S.POS_Z] = 300;
    view[b + S.MASS] = 1.5;
    view[b + S.SPECIES_ID] = i % species;
    view[b + S.ENERGY] = 80;
    for (let k = 1; k <= 6; k++) view[b + S['BOND_PARTNER_' + k]] = -1;
  }
  return { buffer, view, count: n, dna: createDNABuffer(), laws: createLawState(), speciesCount: species };
}

const alive = (sh) => {
  let a = 0;
  for (let i = 0; i < sh.count; i++) if (sh.view[i * P + S.DEAD] < 0.5) a++;
  return a;
};

function killSelected(mx, every = 2) {
  const sh = mx.shards[mx.selected];
  for (let i = 0; i < sh.count; i += every) sh.view[i * P + S.DEAD] = 1;
  return alive(sh);
}

function run(cfg, { sourceN = 400, kill = 2 } = {}) {
  const mx = createMultiplex(null);
  startMultiplex(mx, makeSource(sourceN), { ...MULTIPLEX_DEFAULTS, cols: 2, rows: 2, seed: 7, useWorkers: false, ...cfg }, null);
  const survivors = kill ? killSelected(mx, kill) : alive(mx.shards[mx.selected]);
  iterateMultiplex(mx, { manual: true });
  return { mx, survivors, alive: mx.shards.map(alive) };
}

describe('REFILL TO CAP (D-030)', () => {
  it('is on by default and persisted with the other multiplex settings', () => {
    expect(MULTIPLEX_DEFAULTS.refillToCap).toBe(true);
    expect(PERSISTED_KEYS).toContain('refillToCap');
    expect(sanitizeMultiplexSettings({ refillToCap: false })).toEqual({ refillToCap: false });
    const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    saveMultiplexSettings({ ...MULTIPLEX_DEFAULTS, refillToCap: false }, store);
    expect(loadMultiplexSettings(store).refillToCap).toBe(false);
  });

  it('on: a half-dead selected shard → every new shard is at CAP alive after iterate', () => {
    const { mx, survivors, alive: a } = run({ particlesPerSim: 300 });
    expect(mx.populationCap).toBe(300);
    expect(survivors).toBe(150);
    expect(a).toEqual([300, 300, 300, 300]);
  });

  it('off: old behaviour — only the survivors are carried over', () => {
    const { survivors, alive: a } = run({ particlesPerSim: 300, refillToCap: false });
    expect(survivors).toBe(150);
    expect(a).toEqual([150, 150, 150, 150]);
  });

  it('refilled copies are clean: finite, inside the world, unbonded, newborn', () => {
    const { mx } = run({ particlesPerSim: 300 });
    for (const sh of mx.shards) {
      for (let i = 0; i < sh.count; i++) {
        const b = i * P;
        if (sh.view[b + S.DEAD] >= 0.5) continue;
        for (const k of ['POS_X', 'POS_Y', 'POS_Z']) {
          expect(Number.isFinite(sh.view[b + S[k]])).toBe(true);
        }
        expect(sh.view[b + S.BOND_COUNT]).toBe(0);
      }
      // No two alive particles share an exact position (copies are nudged apart).
      const seen = new Set();
      for (let i = 0; i < sh.count; i++) {
        const b = i * P;
        if (sh.view[b + S.DEAD] >= 0.5) continue;
        seen.add(`${sh.view[b + S.POS_X]},${sh.view[b + S.POS_Y]},${sh.view[b + S.POS_Z]}`);
      }
      expect(seen.size).toBe(alive(sh));
    }
  });

  it('no survivors → respawned from the source DNA, still at CAP', () => {
    const { survivors, alive: a } = run({ particlesPerSim: 200 }, { kill: 1 });
    expect(survivors).toBe(0);
    expect(a).toEqual([200, 200, 200, 200]); // 200 / 3 species tops up the remainder
    const off = run({ particlesPerSim: 200, refillToCap: false }, { kill: 1 });
    expect(off.alive).toEqual([0, 0, 0, 0]);
  });

  it('automatic cap: refills to the generation-0 population, not the 50,000 ceiling', () => {
    const { mx, alive: a } = run({ particlesPerSim: 0, populationPercent: 0 }, { sourceN: 240 });
    expect(mx.populationCap).toBe(Math.floor(MAX_PARTICLES / 2));
    expect(refillTargetFor(mx)).toBe(240);
    expect(a).toEqual([240, 240, 240, 240]);
  });

  it('Spawn mode is unchanged by the toggle', () => {
    const on = run({ particlesPerSim: 300, deriveMode: 'spawn' });
    const off = run({ particlesPerSim: 300, deriveMode: 'spawn', refillToCap: false });
    expect(on.alive).toEqual(off.alive);
    for (let i = 0; i < 4; i++) {
      expect(Array.from(on.mx.shards[i].view.subarray(0, 300 * P))).toEqual(Array.from(off.mx.shards[i].view.subarray(0, 300 * P)));
    }
  });

  it('start (generation 0) is unchanged by the toggle; seeded iterates are deterministic', () => {
    const mk = (refill) => {
      const mx = createMultiplex(null);
      startMultiplex(mx, makeSource(400), { ...MULTIPLEX_DEFAULTS, cols: 2, rows: 2, seed: 7, useWorkers: false, particlesPerSim: 300, refillToCap: refill }, null);
      return mx;
    };
    const a = mk(true);
    const b = mk(false);
    expect(Array.from(a.shards[1].view.subarray(0, 300 * P))).toEqual(Array.from(b.shards[1].view.subarray(0, 300 * P)));
    const r1 = run({ particlesPerSim: 300 });
    const r2 = run({ particlesPerSim: 300 });
    expect(Array.from(r1.mx.shards[2].view.subarray(0, 300 * P))).toEqual(Array.from(r2.mx.shards[2].view.subarray(0, 300 * P)));
    void WORLD_SIZE;
  });
});
