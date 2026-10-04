// LRA-7 (AC-35): the information/biology trace lists the coupling path and a
// fixture shows each hand-off happening in the solver.
import { describe, it, expect } from 'vitest';
import { exportInformationBiologyTrace } from '../../src/state/informationTrace.js';
import { makeWorld, step, field, sum, PARTICLE_STRIDE, S } from '../helpers/lawWorld.js';

const DC = S.DNA_CACHE_START;
const init = (v, b, i, r) => {
  for (let d = 0; d < 42; d++) v[b + DC + d] = r();
  v[b + S.SPECIES_ID] = i % 2; v[b + S.SIGNAL] = 0.2 * r();
};
const world = (extra) => makeWorld({ n: 40, spread: 12, init: extra ? (v, b, i, r) => { init(v, b, i, r); extra(v, b, i, r); } : init });
const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
const speciesDnaVariance = (w) => {
  let s = 0;
  for (let d = 0; d < 42; d += 3) {
    const vals = []; for (let i = 0; i < w.n; i += 2) vals.push(w.view[i * PARTICLE_STRIDE + DC + d]);
    const m = vals.reduce((a, b) => a + b) / vals.length; s += vals.reduce((a, b) => a + (b - m) ** 2, 0);
  }
  return s;
};

describe('information/biology coupling trace (LRA-7)', () => {
  const trace = exportInformationBiologyTrace();
  it('exports memory → learning → culture → behaviour → inheritance with ontology-backed links', () => {
    expect(trace.stages).toEqual(['memory', 'learning', 'culture', 'behaviour', 'inheritance']);
    const byLaw = Object.fromEntries(trace.path.map((p) => [p.law, p]));
    for (const link of trace.links.filter((l) => l.via && l.via !== 'offspring.dna')) {
      expect(byLaw[link.from].writes, `${link.from} writes ${link.via}`).toContain(link.via);
      expect(byLaw[link.to].reads, `${link.to} reads ${link.via}`).toContain(link.via);
    }
    for (const p of trace.path) expect(p.implementedBy).toMatch(/#/);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
  });

  it('memory: contacts raise MEMORY', () => {
    expect(sum(field(step(world(), ['MEMORY'], 10), 'MEMORY'))).toBeGreaterThan(sum(field(world(), 'MEMORY')) + 1);
  });

  it('learning: SYMBOL behaves differently once MEMORY is on', () => {
    expect(l1(field(step(world(), ['MEMORY', 'SYMBOL'], 20), 'VEL_X'), field(step(world(), ['SYMBOL'], 20), 'VEL_X'))).toBeGreaterThan(1e-3);
  });

  it('culture: same-species DNA caches converge', () => {
    const before = speciesDnaVariance(world());
    expect(speciesDnaVariance(step(world(), ['CULTURE'], 30))).toBeLessThan(before * 0.01);
  });

  it('behaviour: culture-shaped DNA changes motion under GRAV', () => {
    expect(l1(field(step(world(), ['CULTURE', 'GRAV'], 30), 'VEL_X'), field(step(world(), ['GRAV'], 30), 'VEL_X'))).toBeGreaterThan(1e-3);
  });

  it('inheritance: offspring carry the (culture-shaped) parent DNA cache', () => {
    const breeder = (v, b) => { v[b + DC + 10] = 8; v[b + S.REPRO_DRIVE] = 100; v[b + S.AGE] = 500; v[b + S.ENERGY] = 150; };
    const w = step(world(breeder), ['CULTURE', 'REPRO'], 30);
    expect(w.offspring?.length).toBeGreaterThan(0);
    const o = w.offspring[0];
    expect(o.dna.length).toBeGreaterThanOrEqual(42);
    const parent = o.parentId * PARTICLE_STRIDE;
    // Offspring DNA tracks the parent's cache (mutation adds noise): the mean
    // locus difference is well below that of an unrelated particle (~1/3 for U(0,1)).
    let diff = 0, unrelated = 0, k = 0;
    const other = ((o.parentId + 1) % w.n) * PARTICLE_STRIDE;
    for (let d = 0; d < 42; d += 3, k++) {
      diff += Math.abs(o.dna[d] - w.view[parent + DC + d]);
      unrelated += Math.abs(o.dna[d] - w.view[other + DC + d]);
    }
    expect(diff / k).toBeLessThan(0.25);
    expect(diff).toBeLessThan(unrelated); // neighbour index is the other species
  });
});
