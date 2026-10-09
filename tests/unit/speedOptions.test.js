// D-034 speed options, sliders since D-036 (PERFORMANCE › SPEED). Every
// slider's default reproduces the pre-option solver bit for bit; other values
// change the run in the intended way.
import { describe, it, expect } from 'vitest';
import {
  WORLD_PARAM_DEFS, SPEED_PARAM_KEYS, SPEED_SLIDER_KEYS, SPEED_FAST_PRESET, LEGACY_SPEED_FLAGS,
  createWorldParams, isSpeedParam, speedValue, speedUnlimited, migrateSpeedParams, worldParamDef,
} from '../../src/state/worldParams.js';
import { EXACT_KEY_HELP as PARAM_HELP } from '../../src/ui/paramHelp.js';
import { runSpeedWorld } from '../helpers/speedWorld.js';

const def = (k) => WORLD_PARAM_DEFS.find((d) => d.key === k);
const defaults = () => Object.fromEntries(SPEED_SLIDER_KEYS.map((k) => [k, def(k).default]));
const perParticlePairs = (params, opts = {}) => {
  const perI = new Map();
  const probe = (kind, view, iBase) => { if (kind === 'pair') perI.set(iBase, (perI.get(iBase) || 0) + 1); };
  runSpeedWorld({ count: 400, spread: 60, ticks: 1, params, probe, ...opts });
  return Math.max(...perI.values());
};

describe('speed sliders: shared contract (D-036)', () => {
  it('are PERFORMANCE › SPEED sliders with the reviewed ranges and defaults', () => {
    const want = {
      PAIRWISE_BUDGET: [8, 512, 96, 8], SPEED_MID_RANGE: [30, 600, 200, 5], SPEED_NEAR_RANGE: [10, 60, 30, 1],
      SPEED_PAIR_BUDGET: [8, 512, 512, 1], SPEED_SYMBIOSIS_RANGE: [10, 600, 600, 5], SPEED_SOCIAL_EVERY: [1, 16, 1, 1],
      SPEED_EXPENSIVE_EVERY: [1, 16, 1, 1],
    };
    expect(Object.keys(want).sort()).toEqual([...SPEED_SLIDER_KEYS].sort());
    for (const [k, [min, max, d, step]] of Object.entries(want)) {
      expect([def(k).group, def(k).subgroup, def(k).min, def(k).max, def(k).default, def(k).step], k).toEqual(['PERFORMANCE', 'SPEED', min, max, d, step]);
      expect(createWorldParams()[k]).toBe(d);
    }
    expect(def('SPEED_PAIR_BUDGET').maxLabel).toBe('OFF');
    expect(def('SPEED_SYMBIOSIS_RANGE').maxLabel).toBe('ANY');
    for (const k of SPEED_PARAM_KEYS) expect(isSpeedParam(k)).toBe(true);
    expect(isSpeedParam('PAIRWISE_BUDGET')).toBe(false); // keeps its multiplex perturbation
  });
  it('have help text that says results change away from the default', () => {
    for (const k of SPEED_SLIDER_KEYS) expect(PARAM_HELP[k]?.what, k).toMatch(/CHANGES RESULTS/);
  });
  it('defaults are bit-identical to a world that has never heard of them', () => {
    const absent = runSpeedWorld({ params: Object.fromEntries(SPEED_SLIDER_KEYS.map((k) => [k, undefined])) });
    expect(runSpeedWorld({ params: defaults() }).hash).toBe(absent.hash);
  });
  it('is deterministic under a seed with every slider moved (FAST)', () => {
    expect(runSpeedWorld({ params: SPEED_FAST_PRESET }).hash).toBe(runSpeedWorld({ params: SPEED_FAST_PRESET }).hash);
  });
  it('speedValue falls back to the default; speedUnlimited is the top end', () => {
    expect(speedValue({}, 'SPEED_MID_RANGE')).toBe(200);
    expect(speedValue({ SPEED_MID_RANGE: NaN }, 'SPEED_MID_RANGE')).toBe(200);
    expect(speedUnlimited({}, 'SPEED_PAIR_BUDGET')).toBe(true);
    expect(speedUnlimited({ SPEED_PAIR_BUDGET: 511 }, 'SPEED_PAIR_BUDGET')).toBe(false);
  });
});

describe('NEIGHBOUR LIMIT (PAIRWISE_BUDGET)', () => {
  it('caps how many neighbours a particle sees', () => {
    expect(perParticlePairs({ PAIRWISE_BUDGET: 48 })).toBeLessThanOrEqual(48);
    expect(perParticlePairs({ PAIRWISE_BUDGET: 8 })).toBeLessThanOrEqual(8);
    expect(perParticlePairs({})).toBeGreaterThan(48);
  });
  it('changes a crowded world and leaves a sparse one alone', () => {
    expect(runSpeedWorld({ count: 400, spread: 60, params: { PAIRWISE_BUDGET: 48 } }).hash).not.toBe(runSpeedWorld({ count: 400, spread: 60 }).hash);
    expect(runSpeedWorld({ count: 60, spread: 1500, params: { PAIRWISE_BUDGET: 48 } }).hash).toBe(runSpeedWorld({ count: 60, spread: 1500 }).hash);
  });
});

describe('MID RANGE', () => {
  it('changes a world with pairs 120–200 apart', () => {
    expect(runSpeedWorld({ count: 300, spread: 600, params: { SPEED_MID_RANGE: 120 } }).hash).not.toBe(runSpeedWorld({ count: 300, spread: 600 }).hash);
  });
  it('is identical while every pair stays inside the range (cube side 60: max distance ≈ 104)', () => {
    expect(runSpeedWorld({ count: 200, spread: 60, ticks: 3, params: { SPEED_MID_RANGE: 120 } }).hash).toBe(runSpeedWorld({ count: 200, spread: 60, ticks: 3 }).hash);
  });
});

describe('NEAR / CONTACT RANGE', () => {
  it('changes a crowded world', () => {
    expect(runSpeedWorld({ count: 300, spread: 60, ticks: 3, params: { SPEED_NEAR_RANGE: 15 } }).hash).not.toBe(runSpeedWorld({ count: 300, spread: 60, ticks: 3 }).hash);
  });
});

describe('PAIR BUDGET / PARTICLE (per particle, not per world)', () => {
  it('limits each particle to the budget whatever the population', () => {
    expect(perParticlePairs({ SPEED_PAIR_BUDGET: 20 })).toBeLessThanOrEqual(20);
    expect(perParticlePairs({ SPEED_PAIR_BUDGET: 20 }, { count: 2000, spread: 120 })).toBeLessThanOrEqual(20);
  });
  it('never exceeds the neighbour limit, and OFF is the default', () => {
    expect(perParticlePairs({ SPEED_PAIR_BUDGET: 300, PAIRWISE_BUDGET: 48 })).toBeLessThanOrEqual(48);
    expect(runSpeedWorld({ count: 400, spread: 60, ticks: 3, params: { SPEED_PAIR_BUDGET: 512 } }).hash).toBe(runSpeedWorld({ count: 400, spread: 60, ticks: 3 }).hash);
  });
  it('a budget at or above what particles see changes nothing', () => {
    expect(runSpeedWorld({ count: 60, spread: 1500, params: { SPEED_PAIR_BUDGET: 50 } }).hash).toBe(runSpeedWorld({ count: 60, spread: 1500 }).hash);
  });
});

describe('SYMBIOSIS & PARASITE RANGE', () => {
  const laws = ['SYMBIOSIS', 'PARASITE', 'LIFE', 'ENERGY'];
  it('changes a world where SYMBIOSIS pairs are far apart', () => {
    expect(runSpeedWorld({ count: 300, spread: 400, laws, params: { SPEED_SYMBIOSIS_RANGE: 30 } }).hash).not.toBe(runSpeedWorld({ count: 300, spread: 400, laws }).hash);
  });
  it('is identical when neither law is on', () => {
    const l = ['GRAV', 'DRAG', 'LIFE', 'ENERGY', 'COMMS'];
    expect(runSpeedWorld({ count: 300, spread: 400, laws: l, ticks: 3, params: { SPEED_SYMBIOSIS_RANGE: 30 } }).hash).toBe(runSpeedWorld({ count: 300, spread: 400, laws: l, ticks: 3 }).hash);
  });
});

describe('SOCIAL & INFO LAWS EVERY N TICKS', async () => {
  const { SPEED_SOCIAL_LAWS } = await import('../../src/physics/solver.js');
  const { LAW_INDEXES } = await import('../../src/constants.js');
  const run = (ticks, n, laws) => runSpeedWorld({ count: 200, spread: 200, ticks, laws, params: n ? { SPEED_SOCIAL_EVERY: n } : {} }).hash;
  it('names only real laws, and keeps HISTORY every tick', () => {
    for (const n of SPEED_SOCIAL_LAWS) expect(LAW_INDEXES[n], n).toBeTypeOf('number');
    expect(SPEED_SOCIAL_LAWS).not.toContain('HISTORY');
  });
  it('runs them on the first tick, then every Nth', () => {
    expect(run(1, 4)).toBe(run(1));
    expect(run(2, 4)).not.toBe(run(2));
    // N = 4 and N = 8 skip the same ticks up to tick 4, then differ at tick 5.
    expect(run(4, 4)).toBe(run(4, 8));
    expect(run(5, 4)).not.toBe(run(5, 8));
  });
  it('is identical in a world with no social or information laws', () => {
    const laws = ['GRAV', 'DRAG', 'COLL', 'LIFE', 'ENERGY', 'REPRO'];
    expect(run(4, 8, laws)).toBe(run(4, 0, laws));
  });
});

describe('FAST preset and D-034 saves', async () => {
  const { parseWorldSave, restoreWorldState, WORLD_SAVE_FORMAT, WORLD_SAVE_VERSION } = await import('../../src/state/worldSave.js');
  const save = (worldParams) => parseWorldSave({ format: WORLD_SAVE_FORMAT, version: WORLD_SAVE_VERSION, particleCount: 0, speciesCount: 1, laws: { low: 0, high: 0, ext: 0, quad: 0, penta: 0 }, worldParams });
  it('FAST sets every slider to the old FAST values (pair budget 20 per particle)', () => {
    expect(SPEED_FAST_PRESET).toEqual({ PAIRWISE_BUDGET: 48, SPEED_MID_RANGE: 120, SPEED_NEAR_RANGE: 30, SPEED_PAIR_BUDGET: 20, SPEED_SYMBIOSIS_RANGE: 30, SPEED_SOCIAL_EVERY: 2, SPEED_EXPENSIVE_EVERY: 1 });
    for (const [k, v] of Object.entries(SPEED_FAST_PRESET)) { expect(v).toBeGreaterThanOrEqual(def(k).min); expect(v).toBeLessThanOrEqual(def(k).max); }
  });
  it('restores saved slider values', () => {
    const live = createWorldParams();
    restoreWorldState(save({ ...SPEED_FAST_PRESET }), { worldParams: live });
    for (const [k, v] of Object.entries(SPEED_FAST_PRESET)) expect(live[k], k).toBe(v);
  });
  it('a save that predates the sliders loads them at their defaults', () => {
    const live = { ...createWorldParams(), ...SPEED_FAST_PRESET };
    restoreWorldState(save({ GLOBAL_G: 1 }), { worldParams: live });
    for (const k of SPEED_PARAM_KEYS) expect(live[k], k).toBe(worldParamDef(k).default);
  });
  it('a D-034 save with on/off flags becomes slider values, flags dropped', () => {
    const live = createWorldParams();
    restoreWorldState(save({ SPEED_NARROW_MID: 1, SPEED_SOCIAL_HALF: 1, SPEED_NEIGHBORS_48: 0, SPEED_FAST: 0 }), { worldParams: live });
    expect([live.SPEED_MID_RANGE, live.SPEED_SOCIAL_EVERY, live.PAIRWISE_BUDGET, live.SPEED_SYMBIOSIS_RANGE]).toEqual([120, 2, 96, 600]);
    for (const k of LEGACY_SPEED_FLAGS) expect(k in live, k).toBe(false);
    const fast = migrateSpeedParams({ ...createWorldParams(), SPEED_FAST: 1 });
    for (const [k, v] of Object.entries(SPEED_FAST_PRESET)) expect(fast[k], k).toBe(v);
  });
});
