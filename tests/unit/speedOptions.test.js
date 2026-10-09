// D-034: results-changing speed options (PERFORMANCE › SPEED). Each option is
// off by default; off must be bit-identical to a world without the key at
// all, and on must change the run in the intended way.
import { describe, it, expect } from 'vitest';
import { WORLD_PARAM_DEFS, SPEED_PARAM_KEYS, createWorldParams, speedOption, isSpeedParam } from '../../src/state/worldParams.js';
import { EXACT_KEY_HELP as PARAM_HELP } from '../../src/ui/paramHelp.js';
import { runSpeedWorld } from '../helpers/speedWorld.js';

const withoutSpeedKeys = () => Object.fromEntries(SPEED_PARAM_KEYS.map((k) => [k, undefined]));

describe('speed options: shared contract (D-034)', () => {
  it('every option is a 0/1 PERFORMANCE › SPEED param, off by default', () => {
    const defaults = createWorldParams();
    for (const key of SPEED_PARAM_KEYS) {
      const def = WORLD_PARAM_DEFS.find((d) => d.key === key);
      expect(def, key).toBeTruthy();
      expect([def.group, def.subgroup, def.min, def.max, def.step, def.default]).toEqual(['PERFORMANCE', 'SPEED', 0, 1, 1, 0]);
      expect(defaults[key]).toBe(0);
      expect(speedOption(defaults, key)).toBe(false);
      expect(isSpeedParam(key)).toBe(true);
    }
  });
  it('every option has help text that says it changes results', () => {
    for (const key of SPEED_PARAM_KEYS) expect(PARAM_HELP[key]?.what, key).toMatch(/CHANGES RESULTS/);
  });
  it('all options off is bit-identical to a world that has never heard of them', () => {
    const off = runSpeedWorld({ params: Object.fromEntries(SPEED_PARAM_KEYS.map((k) => [k, 0])) });
    const absent = runSpeedWorld({ params: withoutSpeedKeys() });
    expect(off.hash).toBe(absent.hash);
  });
  it('is deterministic under a seed with every option on', () => {
    const all = Object.fromEntries(SPEED_PARAM_KEYS.map((k) => [k, 1]));
    expect(runSpeedWorld({ params: all }).hash).toBe(runSpeedWorld({ params: all }).hash);
  });
});

describe('option 2: neighbour limit 48', () => {
  it('changes a crowded world and leaves a sparse one alone', () => {
    const crowdedOff = runSpeedWorld({ count: 400, spread: 60 });
    const crowdedOn = runSpeedWorld({ count: 400, spread: 60, params: { SPEED_NEIGHBORS_48: 1 } });
    expect(crowdedOn.hash).not.toBe(crowdedOff.hash);
    const sparseOff = runSpeedWorld({ count: 60, spread: 1500 });
    const sparseOn = runSpeedWorld({ count: 60, spread: 1500, params: { SPEED_NEIGHBORS_48: 1 } });
    expect(sparseOn.hash).toBe(sparseOff.hash);
  });
  it('never lets a particle see more than 48 neighbours', () => {
    const perI = new Map();
    const probe = (kind, view, iBase) => { if (kind === 'pair') perI.set(iBase, (perI.get(iBase) || 0) + 1); };
    runSpeedWorld({ count: 400, spread: 60, ticks: 1, params: { SPEED_NEIGHBORS_48: 1 }, probe });
    expect(Math.max(...perI.values())).toBeLessThanOrEqual(48);
    perI.clear();
    runSpeedWorld({ count: 400, spread: 60, ticks: 1, probe });
    expect(Math.max(...perI.values())).toBeGreaterThan(48);
  });
});

describe('speed options: saved with the world (D-034)', async () => {
  const { parseWorldSave, restoreWorldState, WORLD_SAVE_FORMAT, WORLD_SAVE_VERSION } = await import('../../src/state/worldSave.js');
  it('restores the saved option values', () => {
    const save = parseWorldSave({ format: WORLD_SAVE_FORMAT, version: WORLD_SAVE_VERSION, particleCount: 0, speciesCount: 1,
      laws: { low: 0, high: 0, ext: 0, quad: 0, penta: 0 }, worldParams: Object.fromEntries(SPEED_PARAM_KEYS.map((k) => [k, 1])) });
    const live = { ...createWorldParams() };
    restoreWorldState(save, { worldParams: live });
    for (const k of SPEED_PARAM_KEYS) expect(live[k], k).toBe(1);
  });
  it('loads a save that predates the options with every option off', () => {
    const legacy = parseWorldSave({ format: WORLD_SAVE_FORMAT, version: WORLD_SAVE_VERSION, particleCount: 0, speciesCount: 1,
      laws: { low: 0, high: 0, ext: 0, quad: 0, penta: 0 }, worldParams: { GLOBAL_G: 1 } });
    const live = { ...createWorldParams(), ...Object.fromEntries(SPEED_PARAM_KEYS.map((k) => [k, 1])) };
    restoreWorldState(legacy, { worldParams: live });
    for (const k of SPEED_PARAM_KEYS) expect(live[k], k).toBe(0);
  });
});

describe('option 3: narrow mid range (120)', () => {
  it('changes a world with pairs 120–200 apart', () => {
    const off = runSpeedWorld({ count: 300, spread: 600 });
    const on = runSpeedWorld({ count: 300, spread: 600, params: { SPEED_NARROW_MID: 1 } });
    expect(on.hash).not.toBe(off.hash);
  });
  it('is identical while every pair stays within 120 (cube side 60: max distance ≈ 104)', () => {
    const off = runSpeedWorld({ count: 200, spread: 60, ticks: 3 });
    const on = runSpeedWorld({ count: 200, spread: 60, ticks: 3, params: { SPEED_NARROW_MID: 1 } });
    expect(on.hash).toBe(off.hash);
  });
});

describe('option 4: pair cap per tick (200k)', () => {
  it('shares the cap evenly: with 5,000 alive each particle sees at most 40 pairs', () => {
    const perI = new Map();
    const probe = (kind, view, iBase) => { if (kind === 'pair') perI.set(iBase, (perI.get(iBase) || 0) + 1); };
    runSpeedWorld({ count: 5000, spread: 300, ticks: 1, params: { SPEED_PAIR_CAP: 1, QUALITY_MODE: 0 }, probe });
    expect(Math.max(...perI.values())).toBeLessThanOrEqual(40);
    perI.clear();
    runSpeedWorld({ count: 5000, spread: 300, ticks: 1, params: { QUALITY_MODE: 0 }, probe });
    expect(Math.max(...perI.values())).toBeGreaterThan(40);
  });
  it('does not bite in a small world (cap ÷ 400 = 500 > the normal limit)', () => {
    const off = runSpeedWorld({ count: 400, spread: 60, ticks: 3 });
    const on = runSpeedWorld({ count: 400, spread: 60, ticks: 3, params: { SPEED_PAIR_CAP: 1 } });
    expect(on.hash).toBe(off.hash);
  });
});

describe('option 5: nearby-only SYMBIOSIS & PARASITE', () => {
  it('changes a world where SYMBIOSIS pairs are far apart', () => {
    const laws = ['SYMBIOSIS', 'PARASITE', 'LIFE', 'ENERGY'];
    const off = runSpeedWorld({ count: 300, spread: 400, laws });
    const on = runSpeedWorld({ count: 300, spread: 400, laws, params: { SPEED_NEAR_SYMBIOSIS: 1 } });
    expect(on.hash).not.toBe(off.hash);
  });
  it('is identical when neither law is on', () => {
    const laws = ['GRAV', 'DRAG', 'LIFE', 'ENERGY', 'COMMS'];
    const off = runSpeedWorld({ count: 300, spread: 400, laws, ticks: 3 });
    const on = runSpeedWorld({ count: 300, spread: 400, laws, ticks: 3, params: { SPEED_NEAR_SYMBIOSIS: 1 } });
    expect(on.hash).toBe(off.hash);
  });
});

describe('option 6: social & information laws every 2nd tick', async () => {
  const { SPEED_SOCIAL_LAWS } = await import('../../src/physics/solver.js');
  const { LAW_INDEXES } = await import('../../src/constants.js');
  it('names only real laws, and keeps HISTORY every tick', () => {
    for (const n of SPEED_SOCIAL_LAWS) expect(LAW_INDEXES[n], n).toBeTypeOf('number');
    expect(SPEED_SOCIAL_LAWS).not.toContain('HISTORY');
  });
  it('runs them on the first tick (identical after 1 tick), skips them on the second', () => {
    const p = { SPEED_SOCIAL_HALF: 1 };
    expect(runSpeedWorld({ count: 300, spread: 200, ticks: 1, params: p }).hash).toBe(runSpeedWorld({ count: 300, spread: 200, ticks: 1 }).hash);
    expect(runSpeedWorld({ count: 300, spread: 200, ticks: 2, params: p }).hash).not.toBe(runSpeedWorld({ count: 300, spread: 200, ticks: 2 }).hash);
  });
  it('is identical in a world with no social or information laws', () => {
    const laws = ['GRAV', 'DRAG', 'COLL', 'LIFE', 'ENERGY', 'REPRO'];
    const off = runSpeedWorld({ count: 300, spread: 200, laws, ticks: 4 });
    const on = runSpeedWorld({ count: 300, spread: 200, laws, ticks: 4, params: { SPEED_SOCIAL_HALF: 1 } });
    expect(on.hash).toBe(off.hash);
  });
});

describe('FAST bundle', () => {
  it('is exactly every speed option on', () => {
    const fast = runSpeedWorld({ count: 400, spread: 300, ticks: 4, params: { SPEED_FAST: 1 } });
    const each = runSpeedWorld({ count: 400, spread: 300, ticks: 4, params: Object.fromEntries(SPEED_PARAM_KEYS.filter((k) => k !== 'SPEED_FAST').map((k) => [k, 1])) });
    const off = runSpeedWorld({ count: 400, spread: 300, ticks: 4 });
    expect(fast.hash).toBe(each.hash);
    expect(fast.hash).not.toBe(off.hash);
  });
  it('turns every option on in speedOption()', () => {
    for (const k of SPEED_PARAM_KEYS) expect(speedOption({ SPEED_FAST: 1 }, k), k).toBe(true);
  });
});
