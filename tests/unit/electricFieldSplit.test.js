// CG-5 / D-005: ELECTRIC_FIELD owns the per-particle polarity drift; FIELD is
// the central-field gradient only. Each toggle is proven alone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LAW_INDEXES, PARTICLE_STRIDE, MAX_PARTICLES, STRIDE_INDEXES as S, DNA_INDEXES as D, DNA_RANGES,
} from '../../src/constants.js';
import { LAW_HELP_DB } from '../../src/constants/help.js';
import { TIDAL_BLOOM } from '../../src/state/defaultPresets.js';
import { createParticleBuffer } from '../../src/state/particleBuffer.js';
import { createLawState, set } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults, getDNAFloat } from '../../src/dna/dnaBuffer.js';
import { solve } from '../../src/physics/solver.js';

const WORLD = 2000;
const DT = 0.25;
const rng = () => 0.5;

function makeWorld(count, polarity, x0 = 100) {
  const view = createParticleBuffer(MAX_PARTICLES, PARTICLE_STRIDE).view;
  const dna = createDNABuffer();
  loadDefaults(dna, DNA_RANGES);
  for (let i = 0; i < count; i++) {
    const b = i * PARTICLE_STRIDE;
    view[b + S.POS_X] = x0 + i * 5; view[b + S.POS_Y] = 100; view[b + S.POS_Z] = 100;
    view[b + S.MASS] = 1.5; view[b + S.SPECIES_ID] = i; view[b + S.ENERGY] = 100; view[b + S.RADIUS] = 0.6;
    for (let d = 0; d < 42; d++) {
      const r = DNA_RANGES[d] || { min: -1, max: 1 };
      view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, i, d, r.min, r.max);
    }
    view[b + S.DNA_CACHE_START + D.POLARITY] = polarity;
  }
  return { view, dna };
}

function step(world, count, law) {
  const st = createLawState();
  if (law !== undefined) set(st, law);
  solve(world.view, count, PARTICLE_STRIDE, st, world.dna, WORLD, DT, rng);
  return [world.view[S.VEL_X], world.view[S.VEL_Y], world.view[S.VEL_Z]];
}

describe('FIELD vs ELECTRIC_FIELD (CG-5)', () => {
  it('ELECTRIC_FIELD alone drifts along POLARITY: opposite signs move opposite ways, uniform on 3 axes', () => {
    const pos = step(makeWorld(1, 1), 1, LAW_INDEXES.ELECTRIC_FIELD);
    const neg = step(makeWorld(1, -1), 1, LAW_INDEXES.ELECTRIC_FIELD);
    for (let a = 0; a < 3; a++) {
      expect(pos[a]).toBeGreaterThan(0);
      expect(neg[a]).toBeLessThan(0);
      expect(pos[a]).toBeCloseTo(-neg[a], 6);
    }
    expect(pos[0]).toBeCloseTo(pos[1], 6);
  });

  it('FIELD alone has no polarity drift: a lone particle stays still whatever its POLARITY', () => {
    for (const q of [1, -1]) {
      const v = step(makeWorld(1, q), 1, LAW_INDEXES.FIELD);
      expect(v).toEqual([0, 0, 0]);
    }
  });

  it('FIELD alone pulls toward the world centre, independent of POLARITY', () => {
    // Two neighbours left of centre (x=100,105 < 1000): FIELD's gradient runs
    // in the neighbour pass and points toward +x (the centre).
    const pos = step(makeWorld(2, 1), 2, LAW_INDEXES.FIELD);
    const neg = step(makeWorld(2, -1), 2, LAW_INDEXES.FIELD);
    expect(pos[0]).toBeGreaterThan(0);
    expect(pos).toEqual(neg);
  });

  it('with no law on, nothing moves', () => {
    expect(step(makeWorld(1, 1), 1)).toEqual([0, 0, 0]);
  });

  it('the ELECTRIC STORM preset and the default TIDAL_BLOOM preset include ELECTRIC_FIELD', () => {
    const src = readFileSync(new URL('../../src/ui/worldPanel.js', import.meta.url), 'utf8');
    const line = src.split('\n').find((l) => l.includes("name: 'ELECTRIC STORM'"));
    expect(line).toMatch(/'ELECTRIC_FIELD'/);
    expect(TIDAL_BLOOM.laws).toContain('ELECTRIC_FIELD');
    expect(TIDAL_BLOOM.laws).toContain('FIELD');
  });

  it('help text agrees: FIELD is the central gradient, ELECTRIC_FIELD is the polarity drift', () => {
    expect(LAW_HELP_DB.FIELD.hint).toMatch(/centre/i);
    expect(LAW_HELP_DB.FIELD.hint).not.toMatch(/polarity/i);
    expect(LAW_HELP_DB.FIELD.system).not.toMatch(/POLARITY ≠ 0/);
    expect(LAW_HELP_DB.ELECTRIC_FIELD.hint).toMatch(/polarity/i);
  });

  it('the sign-off manifest carries an ELECTRIC_FIELD record with implementation evidence', () => {
    const m = JSON.parse(readFileSync(new URL('../../docs/spec/audit/signoff-manifest.json', import.meta.url), 'utf8'));
    const rec = m.records.find((r) => r.law === 'ELECTRIC_FIELD');
    expect(rec).toBeTruthy();
    expect(rec.status).toBe('operational');
    expect(rec.implementation).toBe('src/physics/laws.js');
    expect(rec.dispatch).toMatch(/LAW_INDEXES\.ELECTRIC_FIELD/);
  });
});
