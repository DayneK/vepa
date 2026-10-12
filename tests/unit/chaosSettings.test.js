import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SplitMix32 } from '../../src/core/prng.js';
import { createWorldParams, WORLD_PARAM_DEFS } from '../../src/state/worldParams.js';
import { DNA_COUNT, DNA_RANGES, DEFAULT_DNA_STRIDE } from '../../src/constants.js';
import { createDNABuffer, loadDefaults } from '../../src/dna/dnaBuffer.js';
import { readDNAParam } from '../../src/dna/codec.js';
import { randomizeChaosSettings } from '../../src/state/chaosSettings.js';

describe('default full Chaos settings', () => {
  it('reproducibly samples physical world settings and all 64 traits per active species, without mutating inputs', () => {
    const world = createWorldParams();
    const dna = createDNABuffer();
    loadDefaults(dna, DNA_RANGES);
    const before = dna.slice();
    const first = randomizeChaosSettings(world, dna, 5, new SplitMix32(42));
    expect(first).toEqual(randomizeChaosSettings(world, dna, 5, new SplitMix32(42)));
    expect(first).not.toEqual(randomizeChaosSettings(world, dna, 5, new SplitMix32(43)));
    expect(dna).toEqual(before);
    expect(world).toEqual(createWorldParams());
    for (const def of WORLD_PARAM_DEFS) {
      expect(first.worldParams[def.key]).toBeGreaterThanOrEqual(def.min);
      expect(first.worldParams[def.key]).toBeLessThanOrEqual(def.max);
      if (def.group === 'PERFORMANCE') expect(first.worldParams[def.key]).toBe(world[def.key]);
    }
    expect(first.worldParams.INITIAL_POP).toBeLessThanOrEqual(first.worldParams.MAX_POP);
    expect(first.worldParams.MAX_POP).toBeLessThanOrEqual(first.worldParams.PARTICLE_COUNT);
    for (let s = 0; s < 5; s++) for (let p = 0; p < DNA_COUNT; p++) {
      const value = readDNAParam(first.dna, s, p);
      expect(value).toBeGreaterThanOrEqual(DNA_RANGES[p].min);
      expect(value).toBeLessThanOrEqual(DNA_RANGES[p].max);
      expect(first.dna[s * DEFAULT_DNA_STRIDE + p]).not.toBe(before[s * DEFAULT_DNA_STRIDE + p]);
    }
    expect(first.dna.slice(5 * DEFAULT_DNA_STRIDE)).toEqual(before.slice(5 * DEFAULT_DNA_STRIDE));
  });
  it('default tap stages all settings then restarts, with genome adoption after worker stop', () => {
    const ui = readFileSync(new URL('../../src/ui/ui.js', import.meta.url), 'utf8');
    expect(ui).toMatch(/bus.emit\('sim:chaos'\);\s*bus.emit\('sim:restart'/);
    const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
    const restart = main.slice(main.indexOf("bus.on('sim:restart', (opts"), main.indexOf("bus.on('species:changed'"));
    expect(restart.indexOf('stopPhysicsWorker()')).toBeLessThan(restart.indexOf('dnaBuffer.set(pendingChaosDNA)'));
    expect(restart.indexOf('dnaBuffer.set(pendingChaosDNA)')).toBeLessThan(restart.indexOf('spawnDefaultPopulation'));
    const chaos = main.slice(main.indexOf("bus.on('sim:chaos', () => {"), main.indexOf("bus.on('sim:chaosClear'"));
    expect(chaos).toContain('randomizeChaosSettings(worldParams, dnaBuffer, speciesCount, prng)');
    expect(chaos).not.toContain('Math.random');
    expect(chaos).toContain('lawIndex === LAW_INDEXES.CONTACT');
  });
});
