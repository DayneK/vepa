// D-038 RENDER RESOLUTION (MAX PIXEL RATIO): render-only, default 2 = unchanged.
import { describe, it, expect } from 'vitest';
import { WORLD_PARAM_DEFS, isSpeedParam, SPEED_SLIDER_KEYS, RENDER_PARAM_KEYS, createWorldParams } from '../../src/state/worldParams.js';
import { EXACT_KEY_HELP as PARAM_HELP } from '../../src/ui/paramHelp.js';

describe('RENDER_MAX_DPR (D-038)', () => {
  it('is a PERFORMANCE › SPEED slider 1–2, default 2', () => {
    const d = WORLD_PARAM_DEFS.find((x) => x.key === 'RENDER_MAX_DPR');
    expect([d.group, d.subgroup, d.min, d.max, d.default, d.step]).toEqual(['PERFORMANCE', 'SPEED', 1, 2, 2, 0.25]);
    expect(createWorldParams().RENDER_MAX_DPR).toBe(2);
  });
  it('is never varied by multiplex and is not part of FIDELITY', () => {
    expect(RENDER_PARAM_KEYS).toEqual(['RENDER_MAX_DPR']);
    expect(isSpeedParam('RENDER_MAX_DPR')).toBe(true);
    expect(SPEED_SLIDER_KEYS).not.toContain('RENDER_MAX_DPR');
  });
  it('help says it does not change results', () => {
    expect(PARAM_HELP.RENDER_MAX_DPR.what).toMatch(/does not change results/i);
  });
  it('a save without it loads the default', async () => {
    const { parseWorldSave, restoreWorldState, WORLD_SAVE_FORMAT, WORLD_SAVE_VERSION } = await import('../../src/state/worldSave.js');
    const live = { ...createWorldParams(), RENDER_MAX_DPR: 1 };
    restoreWorldState(parseWorldSave({ format: WORLD_SAVE_FORMAT, version: WORLD_SAVE_VERSION, particleCount: 0, speciesCount: 1, laws: { low: 0, high: 0, ext: 0, quad: 0, penta: 0 }, worldParams: { GLOBAL_G: 1 } }), { worldParams: live });
    expect(live.RENDER_MAX_DPR).toBe(2);
  });
});
