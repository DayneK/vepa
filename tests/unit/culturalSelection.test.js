// MD-CULT (AC-45): prestige bias and environmental selection each bias outcomes.
import { describe, it, expect } from 'vitest';
import { prestigeFidelity, groupPrestige, symbolFitness, environmentalSelection, transmitWithSelection } from '../../src/state/culturalSelection.js';
import { createCivilizationRegistry, foundCulture } from '../../src/state/civilization.js';

const SYMBOLS = Array.from({ length: 40 }, (_, i) => `S${i}`);

function retainedOver(sourcePrestige, receiverPrestige, ticks = 40) {
  let retained = 0;
  for (let t = 0; t < ticks; t++) {
    const reg = createCivilizationRegistry(); reg.tick = t;
    const a = foundCulture(reg, 1, { symbols: SYMBOLS }); const b = foundCulture(reg, 2, { symbols: [] });
    retained += transmitWithSelection(reg, a.id, b.id, { baseFidelity: 0.5, sourcePrestige, receiverPrestige }).retained.length;
  }
  return retained;
}

describe('cultural selection (MD-CULT)', () => {
  it('prestige bias: high-prestige models are copied more faithfully than low-prestige ones', () => {
    expect(prestigeFidelity(0.5, 1, 0)).toBeGreaterThan(0.5);
    expect(prestigeFidelity(0.5, 0, 1)).toBeLessThan(0.5);
    expect(prestigeFidelity(0.5, 0.4, 0.4)).toBe(0.5);
    expect(retainedOver(1, 0)).toBeGreaterThan(retainedOver(0, 1));
  });

  it('prestige is bounded and grows with size, treasury and stability', () => {
    const small = groupPrestige({ members: new Set([1]), treasury: 0, stability: 0.2 });
    const big = groupPrestige({ members: new Set(Array.from({ length: 50 }, (_, i) => i)), treasury: 500, stability: 1 });
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(1);
    expect(groupPrestige(null)).toBe(0);
  });

  it('environmental selection: which symbols survive depends on the environment', () => {
    const harsh = environmentalSelection(SYMBOLS, { scarcity: 1, threat: 1, density: 0 }, 0.6).kept;
    const mild = environmentalSelection(SYMBOLS, { scarcity: 0, threat: 0, density: 1 }, 0.6).kept;
    expect(harsh).not.toEqual(mild);
    expect(harsh.length + mild.length).toBeGreaterThan(0);
    // Mutants share their root's niche.
    expect(symbolFitness('S3*', { scarcity: 0.2 })).toBe(symbolFitness('S3', { scarcity: 0.2 }));
  });

  it('transmitWithSelection prunes the receiver by environment and never duplicates symbols', () => {
    const reg = createCivilizationRegistry();
    const a = foundCulture(reg, 1, { symbols: SYMBOLS }); const b = foundCulture(reg, 2, { symbols: ['S1'] });
    const env = { scarcity: 1, threat: 1, density: 0 };
    const out = transmitWithSelection(reg, a.id, b.id, { baseFidelity: 1, sourcePrestige: 1, receiverPrestige: 0, env, threshold: 0.6 });
    const kept = reg.lifecycle.records.get(b.id).attributes.symbols;
    expect(new Set(kept).size).toBe(kept.length);
    expect(kept.every((s) => symbolFitness(s, env) >= 0.6)).toBe(true);
    expect(out.selectedOut.length).toBeGreaterThan(0);
  });
});
