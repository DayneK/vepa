// NaN-1 (D-026): multiplex metrics never show NaN and the Canvas2D renderer
// never feeds non-finite values to createRadialGradient.
import { describe, it, expect } from 'vitest';
import { PARTICLE_STRIDE as P, STRIDE_INDEXES as S, DNA_INDEXES, WORLD_SIZE } from '../../src/constants.js';
import { computeShardMetrics, getFitnessReport, MULTIPLEX_DEFAULTS } from '../../src/multiplex/multiplex.js';
import { formatMetric, NO_VALUE } from '../../src/multiplex/metricFormat.js';
import { drawParticles } from '../../src/render/renderer.js';

function makeShard(id, n, poison) {
  const view = new Float32Array((n + 4) * P);
  for (let i = 0; i < n; i++) {
    const b = i * P;
    view[b + S.POS_X] = 10 + i; view[b + S.POS_Y] = 20; view[b + S.POS_Z] = 30;
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 50 + id; view[b + S.AGE] = i;
    view[b + S.SPECIES_ID] = i % 3;
  }
  if (poison) poison(view);
  return { id, view, count: n, prevAlive: n, aliveWindow: [n, n - 1] };
}

describe('formatMetric (ΔSEL / ΔAVG readouts)', () => {
  it('renders missing or non-finite values as an em dash, never "NaN"', () => {
    for (const v of [NaN, Infinity, -Infinity, undefined, null, '']) {
      expect(formatMetric(v)).toBe(NO_VALUE);
    }
    expect(NO_VALUE).toBe('—');
  });
  it('formats finite numbers unchanged', () => {
    expect(formatMetric(0)).toBe('0.00');
    expect(formatMetric(0.126)).toBe('0.13');
    expect(formatMetric(1)).toBe('1.00');
    expect(formatMetric('0.5')).toBe('0.50');
  });
});

describe('fitness metrics stay finite with broken particle fields', () => {
  it('computeShardMetrics ignores ±Infinity / NaN fields', () => {
    const shard = makeShard(0, 8, (v) => {
      v[S.ENERGY] = Infinity; v[S.AGE] = -Infinity; v[S.VEL_X] = NaN;
      v[P + S.VEL_Y] = Infinity; v[2 * P + S.POS_X] = NaN; v[3 * P + S.STORED_ENERGY] = Infinity;
    });
    const m = computeShardMetrics(shard, WORLD_SIZE);
    for (const [k, val] of Object.entries(m)) expect(Number.isFinite(val), k).toBe(true);
    expect(m.population).toBe(8);
  });

  it('getFitnessReport yields finite ΔSEL / ΔAVG / fitness when one shard is poisoned', () => {
    const shards = [
      makeShard(0, 10),
      makeShard(1, 12, (v) => { v[S.ENERGY] = Infinity; v[S.VEL_X] = Infinity; }),
      makeShard(2, 6),
      makeShard(3, 9),
    ];
    const mx = { shards, config: { ...MULTIPLEX_DEFAULTS, fitnessWeights: { ...MULTIPLEX_DEFAULTS.fitnessWeights, energy: 1, mobility: 1, delta: 1 } } };
    const r = getFitnessReport(mx);
    expect(Number.isFinite(r.avgDelta)).toBe(true);
    for (const e of r.perShard) {
      expect(Number.isFinite(e.fitness)).toBe(true);
      expect(Number.isFinite(e.rawFitness)).toBe(true);
      for (const [k, val] of Object.entries(e.metrics)) expect(Number.isFinite(val), `${e.id}.${k}`).toBe(true);
    }
  });

  it('finite inputs are unaffected (same report as before the guard)', () => {
    const mk = () => ({ shards: [makeShard(0, 10), makeShard(1, 5), makeShard(2, 7)], config: { ...MULTIPLEX_DEFAULTS } });
    const a = getFitnessReport(mk());
    expect(a.perShard.map((e) => e.fitness)).toEqual([1, 0, 0.4]);
    expect(a.avgDelta).toBeGreaterThan(0);
  });

  it('an empty grid reports ΔAVG 0, not NaN', () => {
    const r = getFitnessReport({ shards: [], config: { ...MULTIPLEX_DEFAULTS } });
    expect(r.avgDelta).toBe(0);
    expect(r.perShard).toEqual([]);
  });
});

describe('Canvas2D renderer guards createRadialGradient', () => {
  function strictCtx() {
    const calls = { gradients: 0, arcs: 0 };
    const assertFinite = (name, args) => {
      for (const a of args) if (!Number.isFinite(a)) throw new TypeError(`${name}: non-finite ${a}`);
    };
    const ctx = {
      globalAlpha: 1, fillStyle: '',
      createRadialGradient: (...a) => { assertFinite('createRadialGradient', a); calls.gradients++; return { addColorStop() {} }; },
      beginPath() {}, fill() {},
      arc: (...a) => { assertFinite('arc', a.slice(0, 3)); calls.arcs++; },
    };
    return { ctx, calls };
  }

  it('does not throw for stars with Infinity mass, NaN DNA radius or Infinity position', () => {
    const n = 6;
    const view = new Float32Array(n * P);
    for (let i = 0; i < n; i++) {
      const b = i * P;
      view[b + S.POS_X] = WORLD_SIZE / 2; view[b + S.POS_Y] = WORLD_SIZE / 2; view[b + S.POS_Z] = WORLD_SIZE / 2;
      view[b + S.MASS] = 40; // above runtimeConfig.starMass → gradient branch
      view[b + S.ALPHA] = 0.8;
      view[b + S.DNA_CACHE_START + DNA_INDEXES.BASE_RADIUS] = 1;
    }
    view[0 * P + S.MASS] = Infinity;                                  // radius → Infinity
    view[1 * P + S.DNA_CACHE_START + DNA_INDEXES.BASE_RADIUS] = NaN;  // radius → NaN
    view[2 * P + S.POS_X] = Infinity;                                 // projection → NaN
    view[3 * P + S.POS_Z] = -Infinity;
    const { ctx, calls } = strictCtx();
    const renderer = { ctx, width: 800, height: 600 };
    expect(() => drawParticles(renderer, view, n, P, WORLD_SIZE)).not.toThrow();
    // Healthy stars still get their gradient halo; broken radii fall back to
    // the minimum size instead of vanishing.
    expect(calls.gradients).toBeGreaterThanOrEqual(3);
  });
});
