// D-038 FIDELITY presets (PERFORMANCE › SPEED selector, multiplex GRID & PERF).
import { describe, it, expect } from 'vitest';
import {
  SPEED_FIDELITY_LEVELS, SPEED_SLIDER_KEYS, SPEED_FAST_PRESET, SPEED_LOW_PRESET, FIDELITY_LAW_COUNT,
  fidelityPreset, fidelityOf, worldParamDef, createWorldParams,
} from '../../src/state/worldParams.js';
import { runSpeedWorld } from '../helpers/speedWorld.js';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S } from '../../src/constants.js';

describe('FIDELITY presets (D-038)', () => {
  it('are HIGH / MEDIUM / LOW', () => {
    expect(SPEED_FIDELITY_LEVELS).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });
  it('HIGH = every speed slider at its default (= DEFAULTS), so a fresh world is HIGH', () => {
    const high = fidelityPreset('HIGH');
    for (const k of SPEED_SLIDER_KEYS) expect(high[k], k).toBe(worldParamDef(k).default);
    expect(fidelityOf(createWorldParams())).toBe('HIGH');
    expect(fidelityOf({})).toBe('HIGH');
  });
  it('HIGH is bit-identical to a world without the speed sliders', () => {
    const absent = runSpeedWorld({ params: Object.fromEntries(SPEED_SLIDER_KEYS.map((k) => [k, undefined])) });
    expect(runSpeedWorld({ params: fidelityPreset('HIGH') }).hash).toBe(absent.hash);
  });
  it('MEDIUM = the old FAST values', () => {
    expect(fidelityPreset('MEDIUM')).toEqual(SPEED_FAST_PRESET);
    expect(fidelityOf(SPEED_FAST_PRESET)).toBe('MEDIUM');
  });
  it('LOW sets every speed slider inside its range, and is detected', () => {
    expect(Object.keys(SPEED_LOW_PRESET).sort()).toEqual([...SPEED_SLIDER_KEYS].sort());
    for (const [k, v] of Object.entries(SPEED_LOW_PRESET)) {
      expect(v, k).toBeGreaterThanOrEqual(worldParamDef(k).min);
      expect(v, k).toBeLessThanOrEqual(worldParamDef(k).max);
    }
    expect(fidelityOf(SPEED_LOW_PRESET)).toBe('LOW');
    expect(fidelityOf({ ...SPEED_LOW_PRESET, SPEED_MID_RANGE: 61 })).toBe('CUSTOM');
  });
  it('multiplex LAW COUNT: 136 for HIGH / MEDIUM, the 16-law light set for LOW', () => {
    expect(FIDELITY_LAW_COUNT).toEqual({ HIGH: 136, MEDIUM: 136, LOW: 16 });
  });
  it('LOW is deterministic and keeps a working sim (no NaN, everyone alive)', () => {
    const a = runSpeedWorld({ params: SPEED_LOW_PRESET, ticks: 20 });
    const b = runSpeedWorld({ params: SPEED_LOW_PRESET, ticks: 20 });
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(runSpeedWorld({ params: {}, ticks: 20 }).hash);
    let alive = 0, bad = 0;
    for (let i = 0; i < 400; i++) {
      const b = i * PARTICLE_STRIDE;
      if (a.view[b + S.DEAD] < 0.5 && a.view[b + S.MASS] > 0) alive++;
      for (const k of [S.POS_X, S.POS_Y, S.POS_Z, S.VEL_X, S.ENERGY]) if (!Number.isFinite(a.view[b + k])) bad++;
    }
    expect(bad).toBe(0);
    expect(alive).toBe(400);
  });
});
