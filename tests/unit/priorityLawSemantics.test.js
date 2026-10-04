// ARP-8 (AC-39): one behaviour and one boundary test per priority law
// (src/state/priorityLaws.js). Behaviour tests compare law-on against law-off
// on the same fixture, so "no effect because gated" is distinguished from
// "no effect because broken".
import { describe, it, expect } from 'vitest';
import { PRIORITY_LAWS } from '../../src/state/priorityLaws.js';
import { makeWorld, step, field, sum, S, PARTICLE_STRIDE as P } from '../helpers/lawWorld.js';
import { DNA_RANGES, DNA_INDEXES as D } from '../../src/constants.js';
import { createDNABuffer, loadDefaults, getDNAFloat } from '../../src/dna/dnaBuffer.js';

const DNA = createDNABuffer(); loadDefaults(DNA, DNA_RANGES);
/** Fill each particle's DNA cache from the default species genome (as spawn does). */
function withDNA(w, overrides = {}) {
  for (let i = 0; i < w.n; i++) {
    const b = i * P, sp = w.view[b + S.SPECIES_ID] | 0;
    for (let d = 0; d < 42; d++) { const r = DNA_RANGES[d] || { min: -1, max: 1 }; w.view[b + S.DNA_CACHE_START + d] = getDNAFloat(DNA, sp, d, r.min, r.max); }
    for (const [k, v] of Object.entries(overrides)) w.view[b + S.DNA_CACHE_START + D[k]] = typeof v === 'function' ? v(i) : v;
  }
  return w;
}

const C = 1000; // world centre for worldSize 2000
const at = (x, extra = {}) => ({ x, ...extra });
/** Build a world from explicit particle specs: {x, y?, vx?, charge?, ...stride fields}. */
function world(specs) {
  const w = makeWorld({ n: specs.length });
  specs.forEach((s, i) => {
    const b = i * P;
    w.view[b + S.POS_X] = C + s.x; w.view[b + S.POS_Y] = C + (s.y || 0); w.view[b + S.POS_Z] = C;
    w.view[b + S.ENTANGLE_ID] = -1;
    for (const [k, v] of Object.entries(s)) if (S[k] !== undefined) w.view[b + S[k]] = v;
  });
  return w;
}
const get = (w, i, f) => w.view[i * P + S[f]];
const gap = (w) => Math.abs(get(w, 1, 'POS_X') - get(w, 0, 'POS_X'));
const speed = (w, i) => Math.hypot(get(w, i, 'VEL_X'), get(w, i, 'VEL_Y'), get(w, i, 'VEL_Z'));
const cloud = (init, n = 40, spread = 12) => makeWorld({ n, spread, init: (v, b, i, r) => { v[b + S.ENTANGLE_ID] = -1; init?.(v, b, i, r); } });
const amps = (w, i) => ['SUPER_AMP_1', 'SUPER_AMP_2', 'SUPER_AMP_3', 'SUPER_AMP_4'].map((f) => get(w, i, f));

/** behaviour(on, off) gets the world stepped with and without the law. */
const SPECS = {
  GRAV: {
    behaviour: () => { const mk = () => world([at(-5), at(5)]); const on = step(mk(), ['GRAV'], 30), off = step(mk(), [], 30); expect(gap(on)).toBeLessThan(10); expect(gap(off)).toBe(10); },
    boundary: () => { const w = step(world([at(0), at(0)]), ['GRAV'], 20); expect([0, 1].every((i) => Number.isFinite(speed(w, i)))).toBe(true); },
  },
  CHARGE_LAW: {
    behaviour: () => {
      const unlike = step(world([at(-3, { CHARGE: 1 }), at(3, { CHARGE: -1 })]), ['CHARGE_LAW'], 20);
      const like = step(world([at(-3, { CHARGE: 1 }), at(3, { CHARGE: 1 })]), ['CHARGE_LAW'], 20);
      expect(gap(unlike)).toBeLessThan(6); expect(gap(like)).toBeGreaterThan(6);
    },
    boundary: () => { const w = step(world([at(-3), at(3)]), ['CHARGE_LAW'], 20); expect(gap(w)).toBe(6); },
  },
  DRAG: {
    behaviour: () => { const mk = () => world([at(0, { VEL_X: 2 })]); const on = step(mk(), ['DRAG'], 20), off = step(mk(), [], 20); expect(speed(on, 0)).toBeLessThan(2); expect(speed(off, 0)).toBe(2); },
    boundary: () => { let prev = 2; const w = world([at(0, { VEL_X: 2 })]); step(w, ['DRAG'], 60, { each: (wd) => { const v = get(wd, 0, 'VEL_X'); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(prev + 1e-6); prev = v; } }); },
  },
  ELECTRIC_FIELD: {
    behaviour: () => { const mk = () => withDNA(world([at(-4, { CHARGE: 1 }), at(4, { CHARGE: 1 })]), { POLARITY: 1 }); const on = step(mk(), ['ELECTRIC_FIELD'], 30), off = step(mk(), [], 30); expect(speed(on, 0) + speed(on, 1)).toBeGreaterThan(0); expect(speed(off, 0) + speed(off, 1)).toBe(0); },
    boundary: () => { const w = step(withDNA(world([at(-4), at(4)]), { POLARITY: 0 }), ['ELECTRIC_FIELD'], 30); expect(speed(w, 0) + speed(w, 1)).toBe(0); },
  },
  LIFE: {
    behaviour: () => { const mk = () => withDNA(world([at(0, { HUNGER: 99.9999 })])); const on = step(mk(), ['DRAG', 'LIFE'], 30), off = step(mk(), ['DRAG'], 30); expect(get(on, 0, 'DEAD')).toBe(1); expect(get(off, 0, 'DEAD')).toBe(0); },
    boundary: () => { const w = step(withDNA(world([at(0, { ENERGY: 40, DEAD: 1 })])), ['LIFE'], 30); expect(get(w, 0, 'ENERGY')).toBe(40); },
  },
  REPRO: {
    behaviour: () => { const mk = () => withDNA(world([at(0, { AGE: 200, ENERGY: 90, REPRO_DRIVE: 100 })])); const on = step(mk(), ['LIFE', 'REPRO'], 600), off = step(mk(), ['LIFE'], 600); expect((on.offspring || []).length).toBeGreaterThan(0); expect((off.offspring || []).length).toBe(0); },
    boundary: () => { const w = step(withDNA(world([at(0, { AGE: 0, ENERGY: 90, REPRO_DRIVE: 100 })])), ['REPRO'], 60); expect((w.offspring || []).length).toBe(0); },
  },
  SENESCENCE: {
    behaviour: () => { const mk = () => withDNA(world(Array.from({ length: 30 }, (_, i) => at(i * 50 - 750, { AGE: 5000, ENERGY: 1000 }))), { DEATH_RATE: 1 }); const on = step(mk(), ['LIFE', 'SENESCENCE'], 600, { dt: 1 }), off = step(mk(), ['LIFE'], 600, { dt: 1 }); expect(sum(field(on, 'DEAD'))).toBeGreaterThan(0); expect(sum(field(off, 'DEAD'))).toBe(0); },
    boundary: () => { const w = step(withDNA(world(Array.from({ length: 30 }, (_, i) => at(i * 50 - 750, { AGE: 0, ENERGY: 1000 }))), { DEATH_RATE: 1 }), ['LIFE', 'SENESCENCE'], 400, { dt: 1 }); expect(sum(field(w, 'DEAD'))).toBe(0); },
  },
  ENERGY: {
    behaviour: () => { const mk = () => world([at(-5, { ENERGY: 90 }), at(5, { ENERGY: 10 })]); const on = step(mk(), ['ENERGY'], 30), off = step(mk(), [], 30); const d = (w) => get(w, 0, 'ENERGY') - get(w, 1, 'ENERGY'); expect(d(on)).toBeLessThan(80); expect(d(off)).toBe(80); expect(get(on, 0, 'ENERGY') + get(on, 1, 'ENERGY')).toBeCloseTo(100, 3); },
    boundary: () => { const w = step(world([at(-5, { ENERGY: 50 }), at(5, { ENERGY: 50 })]), ['ENERGY'], 30); expect(get(w, 0, 'ENERGY')).toBe(50); expect(get(w, 1, 'ENERGY')).toBe(50); },
  },
  COLL: {
    behaviour: () => { const mk = () => world([at(-0.2), at(0.2)]); const on = step(mk(), ['COLL'], 20), off = step(mk(), [], 20); expect(gap(on)).toBeGreaterThan(gap(off)); },
    boundary: () => { const w = cloud((v, b, i, r) => { v[b + S.VEL_X] = (r() - 0.5) * 4; }, 60, 6); step(w, ['COLL'], 60); const s = Array.from({ length: w.n }, (_, i) => speed(w, i)); expect(s.every(Number.isFinite)).toBe(true); expect(Math.max(...s)).toBeLessThan(20); },
  },
  CONTACT: {
    behaviour: () => { const mk = () => world([at(-0.2), at(0.2)]); const on = step(mk(), ['CONTACT'], 20), off = step(mk(), [], 20); expect(gap(on)).toBeGreaterThan(gap(off)); },
    boundary: () => { const w = step(world([at(-50), at(50)]), ['CONTACT'], 20); expect(gap(w)).toBe(100); },
  },
  BOND: {
    behaviour: () => { const mk = () => withDNA(cloud(null, 40, 6)); const on = step(mk(), ['BOND'], 60), off = step(mk(), [], 60); expect(field(on, 'BOND_PARTNER_1').filter((v) => v >= 0).length).toBeGreaterThan(0); expect(field(off, 'BOND_PARTNER_1').filter((v) => v >= 0).length).toBe(0); },
    boundary: () => {
      const w = step(withDNA(cloud(null, 40, 6)), ['BOND'], 60);
      for (let i = 0; i < w.n; i++) {
        const partners = [1, 2, 3, 4, 5, 6].map((k) => S[`BOND_PARTNER_${k}`]).filter((f) => f !== undefined).map((f) => w.view[i * P + f]).filter((v) => v >= 0);
        expect(partners).not.toContain(i);
        expect(new Set(partners).size).toBe(partners.length);
      }
    },
  },
  MEMORY: {
    behaviour: () => { const mk = () => cloud(); const on = step(mk(), ['MEMORY'], 30), off = step(mk(), [], 30); expect(sum(field(on, 'MEMORY'))).toBeGreaterThan(0); expect(sum(field(off, 'MEMORY'))).toBe(0); },
    boundary: () => { const w = step(cloud(), ['MEMORY'], 300); expect(Array.from(field(w, 'MEMORY')).every((m) => Number.isFinite(m) && m >= 0)).toBe(true); },
  },
  SIGNAL_BOOST: {
    behaviour: () => { const mk = () => world([at(-3, { SIGNAL: 1 }), at(3)]); const on = step(mk(), ['SIGNAL_BOOST'], 10), off = step(mk(), [], 10); expect(get(on, 1, 'SIGNAL')).toBeGreaterThan(0); expect(get(off, 1, 'SIGNAL')).toBe(0); },
    boundary: () => {
      const silent = step(world([at(-3, { SIGNAL: 0.005 }), at(3)]), ['SIGNAL_BOOST'], 10); expect(get(silent, 1, 'SIGNAL')).toBe(0);
      const loud = step(world([at(-3, { SIGNAL: 1 }), at(3, { SIGNAL: 1 })]), ['SIGNAL_BOOST'], 30); expect(Math.max(get(loud, 0, 'SIGNAL'), get(loud, 1, 'SIGNAL'))).toBeLessThanOrEqual(1);
    },
  },
  LEARN: {
    behaviour: () => { const mk = () => world([at(-3, { VEL_X: 1 }), at(3, { VEL_X: -1 })]); const on = step(mk(), ['LEARN'], 10), off = step(mk(), [], 10); const diff = (w) => Math.abs(get(w, 0, 'VEL_X') - get(w, 1, 'VEL_X')); expect(diff(on)).toBeLessThan(2); expect(diff(off)).toBe(2); },
    boundary: () => { const w = step(world([at(-3, { VEL_X: 1 }), at(3, { VEL_X: 1 })]), ['LEARN'], 10); expect(get(w, 0, 'VEL_X')).toBeCloseTo(get(w, 1, 'VEL_X'), 6); },
  },
  SUPERPOSITION: {
    behaviour: () => { const mk = () => cloud(); const on = step(mk(), ['SUPERPOSITION'], 10), off = step(mk(), [], 10); expect(sum(field(on, 'SUPER_AMP_1'))).toBeGreaterThan(0); expect(sum(field(off, 'SUPER_AMP_1'))).toBe(0); },
    boundary: () => { const w = step(cloud(), ['SUPERPOSITION'], 200); for (let i = 0; i < w.n; i++) for (const a of amps(w, i)) { expect(Number.isFinite(a)).toBe(true); expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); } },
  },
  WAVE_PARTICLE: {
    behaviour: () => { const mk = () => world([at(0, { WAVE_MEASURED: 1 })]); const on = step(mk(), ['WAVE_PARTICLE'], 60), off = step(mk(), [], 60); expect(get(on, 0, 'WAVE_MEASURED')).toBeLessThan(0.1); expect(get(off, 0, 'WAVE_MEASURED')).toBe(1); },
    boundary: () => { const w = step(world([at(0)]), ['WAVE_PARTICLE'], 60); expect(get(w, 0, 'WAVE_MEASURED')).toBe(0); },
  },
  ENTANGLEMENT: {
    behaviour: () => {
      const mk = () => cloud(null, 40, 6); const on = step(mk(), ['ENTANGLEMENT'], 30), off = step(mk(), [], 30);
      const ids = field(on, 'ENTANGLE_ID'); expect(ids.filter((v) => v >= 0).length).toBeGreaterThan(0);
      ids.forEach((j, i) => { if (j >= 0) expect(ids[j]).toBe(i); });
      expect(field(off, 'ENTANGLE_ID').every((v) => v === -1)).toBe(true);
    },
    boundary: () => { const w = step(world([at(-400), at(400)]), ['ENTANGLEMENT'], 30); expect([get(w, 0, 'ENTANGLE_ID'), get(w, 1, 'ENTANGLE_ID')]).toEqual([-1, -1]); },
  },
  OBSERVER: {
    behaviour: () => { const mk = () => world([at(-2, { MEMORY: 0.9 }), at(2)]); const on = step(mk(), ['WAVE_PARTICLE', 'OBSERVER'], 1), off = step(mk(), ['WAVE_PARTICLE'], 1); expect(get(on, 1, 'WAVE_MEASURED')).toBeGreaterThan(0.1); expect(get(off, 1, 'WAVE_MEASURED')).toBe(0); },
    boundary: () => { const w = step(world([at(-2, { MEMORY: 0.1 }), at(2, { MEMORY: 0.1 })]), ['WAVE_PARTICLE', 'OBSERVER'], 5); expect(get(w, 1, 'WAVE_MEASURED')).toBe(0); },
  },
};

describe('priority law semantics (ARP-8)', () => {
  it('every priority law has a behaviour and a boundary test, and no extras', () => {
    expect(Object.keys(SPECS).sort()).toEqual(PRIORITY_LAWS.map((p) => p.law).sort());
    for (const s of Object.values(SPECS)) { expect(typeof s.behaviour).toBe('function'); expect(typeof s.boundary).toBe('function'); }
  });
  for (const p of PRIORITY_LAWS) {
    describe(`${p.law} (${p.family})`, () => {
      it(`behaviour: ${p.behaviour}`, SPECS[p.law].behaviour);
      it(`boundary: ${p.boundary}`, SPECS[p.law].boundary);
    });
  }
});
