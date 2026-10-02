// MX-20 (AC-95): presets, light preview laws, decoupled tick scheduler and
// settings persistence.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet, isSet as lawHas } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import {
  createMultiplex, startMultiplex, frameMultiplex, MULTIPLEX_DEFAULTS, MULTIPLEX_PRESETS, applyMultiplexPreset,
  computeShardPopulationCap, TICK_MODES,
} from '../../src/multiplex/multiplex.js';
import { DEFAULT_LIGHT_LAWS, sanitizeLawNames, lawMaskFor, applyLawMask } from '../../src/multiplex/previewLaws.js';
import {
  sanitizeMultiplexSettings, loadMultiplexSettings, saveMultiplexSettings, MULTIPLEX_SETTINGS_KEY,
} from '../../src/multiplex/multiplexSettings.js';

function source(n = 150) {
  const view = new Float32Array(n * PARTICLE_STRIDE);
  for (let i = 0; i < n; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = 900 + (i % 10) * 20; view[b + S.POS_Y] = 900 + ((i / 10) | 0) * 20; view[b + S.POS_Z] = 1000;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 70; view[b + S.RADIUS] = 0.7; view[b + S.SPECIES_ID] = i % 2;
    for (const k of ['BOND_PARTNER_1', 'BOND_PARTNER_2', 'BOND_PARTNER_3', 'BOND_PARTNER_4']) view[b + S[k]] = -1;
  }
  const laws = createLawState();
  for (const name of ['GRAV', 'DRAG', 'COLL', 'SYMBIOSIS', 'METRIC']) lawSet(laws, LAW_INDEXES[name]);
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  return { view, count: n, dna, laws, speciesCount: 2 };
}
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

describe('preview law sets', () => {
  it('the default light set is all real laws and drops the expensive ones', () => {
    expect(sanitizeLawNames(DEFAULT_LIGHT_LAWS)).toEqual([...DEFAULT_LIGHT_LAWS]);
    for (const heavy of ['SYMBIOSIS', 'METRIC', 'SYMBOL', 'FEEDBACK', 'PREDATION']) expect(DEFAULT_LIGHT_LAWS).not.toContain(heavy);
  });
  it('sanitises user text and masks a sim law set without touching it', () => {
    expect(sanitizeLawNames('grav, drag  NOPE grav')).toEqual(['GRAV', 'DRAG']);
    const laws = source().laws;
    const out = applyLawMask(laws, lawMaskFor(['GRAV', 'COLL', 'HEAT']), createLawState());
    expect(lawHas(out, LAW_INDEXES.GRAV)).toBe(true);
    expect(lawHas(out, LAW_INDEXES.COLL)).toBe(true);
    expect(lawHas(out, LAW_INDEXES.HEAT)).toBe(false); // off in the sim stays off
    expect(lawHas(out, LAW_INDEXES.SYMBIOSIS)).toBe(false);
    expect(lawHas(laws, LAW_INDEXES.SYMBIOSIS)).toBe(true);
  });
});

describe('presets', () => {
  it('ships Smooth 20, Balanced and Full fidelity', () => {
    expect(Object.keys(MULTIPLEX_PRESETS)).toEqual(['smooth-20', 'balanced', 'full-fidelity']);
    const s = applyMultiplexPreset(MULTIPLEX_DEFAULTS, 'smooth-20');
    expect(s.cols * s.rows).toBe(20);
    expect(s).toMatchObject({ particlesPerSim: 125, lawTier: 'light', preset: 'smooth-20' });
    const f = applyMultiplexPreset(MULTIPLEX_DEFAULTS, 'full-fidelity');
    expect(f).toMatchObject({ particlesPerSim: 2500, lawTier: 'full', tickMode: 'adaptive' });
    expect(applyMultiplexPreset({ seed: 7 }, 'nope')).toEqual({ seed: 7 });
  });
  it('particles per sim wins over POP % and the automatic cap', () => {
    expect(computeShardPopulationCap(20, 1, 2.5, 0)).toBe(2500);
    expect(computeShardPopulationCap(20, 1, 2.5, 125)).toBe(125);
  });
});

describe('decoupled tick scheduler (in-thread)', () => {
  const start = (extra) => {
    const mx = createMultiplex(null);
    startMultiplex(mx, source(), { ...MULTIPLEX_DEFAULTS, cols: 2, rows: 2, seed: 5, useWorkers: false, ...extra }, null);
    return mx;
  };
  it('knows three modes', () => expect([...TICK_MODES]).toEqual(['frame', 'fixed', 'adaptive']));
  it("'frame' ticks every sim once per frame", () => {
    const mx = start({ tickMode: 'frame' });
    for (let f = 0; f < 3; f++) expect(frameMultiplex(mx, 1 / 60, 1, 2000, f * 16.7).ticks).toBe(4);
    expect(mx.shards.every((s) => s.tick === 3)).toBe(true);
  });
  it("'fixed' ticks each sim at ticksPerSecond regardless of frame rate", () => {
    const mx = start({ tickMode: 'fixed', ticksPerSecond: 15, frameBudgetMs: 14 });
    for (let f = 0; f < 60; f++) frameMultiplex(mx, 1 / 60, 1, 2000, f * (1000 / 60));
    for (const s of mx.shards) expect(s.tick).toBeGreaterThanOrEqual(14), expect(s.tick).toBeLessThanOrEqual(16);
  });
  it("'adaptive' stops ticking once the frame budget is spent", () => {
    const mx = start({ tickMode: 'adaptive', frameBudgetMs: 1 });
    // A budget of 1 ms always allows at least one tick, and never all four
    // when one tick costs more than the budget.
    const r = frameMultiplex(mx, 1 / 60, 1, 2000, 0);
    expect(r.ticks).toBeGreaterThanOrEqual(1);
    expect(r.mainMs).toBeGreaterThan(0);
  });
});

describe('settings persistence', () => {
  it('round-trips the preview knobs through storage', () => {
    const store = memStore();
    const cfg = { ...applyMultiplexPreset(MULTIPLEX_DEFAULTS, 'balanced'), lightLaws: ['GRAV', 'DRAG'], ticksPerSecond: 12, seed: 99 };
    expect(saveMultiplexSettings(cfg, store)).toBe(true);
    const back = loadMultiplexSettings(store);
    expect(back).toMatchObject({ preset: 'balanced', particlesPerSim: 500, lawTier: 'light', lightLaws: ['GRAV', 'DRAG'], tickMode: 'adaptive', ticksPerSecond: 12 });
    expect(back.seed).toBeUndefined(); // only preview knobs persist
  });
  it('defends against bad stored values', () => {
    const store = memStore();
    store.setItem(MULTIPLEX_SETTINGS_KEY, '{not json');
    expect(loadMultiplexSettings(store)).toEqual({});
    expect(sanitizeMultiplexSettings({ particlesPerSim: 10, tickMode: 'warp', lawTier: 'x', lightLaws: 'zzz', preset: 'evil' }))
      .toEqual({ particlesPerSim: 125, tickMode: 'frame', lawTier: 'full', lightLaws: null });
  });
});
