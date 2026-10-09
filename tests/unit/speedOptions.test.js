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
