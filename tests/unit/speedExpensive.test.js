// D-037 EXPENSIVE LAWS EVERY N TICKS (PERFORMANCE › SPEED). Default 1 is the
// pre-option solver; N > 1 runs the eight costliest laws on the first tick
// and then every Nth tick.
import { describe, it, expect } from 'vitest';
import { WORLD_PARAM_DEFS, isSpeedParam, SPEED_FAST_PRESET } from '../../src/state/worldParams.js';
import { SPEED_EXPENSIVE_LAWS } from '../../src/physics/solver.js';
import { LAW_INDEXES } from '../../src/constants.js';
import { runSpeedWorld } from '../helpers/speedWorld.js';

const LAWS = ['GRAV', 'DRAG', 'COLL', 'LIFE', 'ENERGY', 'REPRO', ...SPEED_EXPENSIVE_LAWS];
const run = (ticks, n, laws = LAWS) => runSpeedWorld({ count: 200, spread: 200, ticks, laws, params: n ? { SPEED_EXPENSIVE_EVERY: n } : {} }).hash;

describe('EXPENSIVE LAWS EVERY N TICKS (D-037)', () => {
  it('is a SPEED slider 1–16, default 1, never varied by multiplex, not in FAST', () => {
    const d = WORLD_PARAM_DEFS.find((x) => x.key === 'SPEED_EXPENSIVE_EVERY');
    expect([d.group, d.subgroup, d.min, d.max, d.default, d.step]).toEqual(['PERFORMANCE', 'SPEED', 1, 16, 1, 1]);
    expect(isSpeedParam('SPEED_EXPENSIVE_EVERY')).toBe(true);
    expect(SPEED_FAST_PRESET.SPEED_EXPENSIVE_EVERY).toBe(1);
  });
  it('names eight real laws', () => {
    expect(SPEED_EXPENSIVE_LAWS).toHaveLength(8);
    for (const n of SPEED_EXPENSIVE_LAWS) expect(LAW_INDEXES[n], n).toBeTypeOf('number');
  });
  it('default 1 is bit-identical to a world without the setting', () => {
    expect(run(6, 1)).toBe(run(6, 0));
  });
  it('runs them on the first tick, then every Nth (deterministic)', () => {
    expect(run(1, 4)).toBe(run(1));
    expect(run(3, 4)).not.toBe(run(3));
    expect(run(4, 4)).toBe(run(4, 8));
    expect(run(5, 4)).not.toBe(run(5, 8));
    expect(run(6, 3)).toBe(run(6, 3));
  });
  it('is identical in a world with none of the expensive laws on', () => {
    const laws = ['GRAV', 'DRAG', 'COLL', 'LIFE', 'ENERGY', 'REPRO'];
    expect(run(4, 8, laws)).toBe(run(4, 0, laws));
  });
  it('stacks with SOCIAL & INFO EVERY N', () => {
    const both = (t) => runSpeedWorld({ count: 200, spread: 200, ticks: t, laws: [...LAWS, 'COMMS', 'MEMORY'], params: { SPEED_EXPENSIVE_EVERY: 2, SPEED_SOCIAL_EVERY: 2 } }).hash;
    expect(both(4)).toBe(both(4));
  });
});
