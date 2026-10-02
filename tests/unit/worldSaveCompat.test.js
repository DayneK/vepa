// FSM-SAVE: world-save compatibility policy (docs/WORLD-SAVE-POLICY.md).
import { describe, it, expect } from 'vitest';
import {
  WORLD_SAVE_VERSION, WORLD_SAVE_FORMAT, parseWorldSave, restoreWorldState,
  exportWorldSave, captureWorldState, assertSupportedVersion, encodeBase64,
} from '../../src/state/worldSave.js';
import { PARTICLE_STRIDE } from '../../src/constants.js';

// A frozen v1 file as written before the civilization/codex fields existed.
function legacyV1File() {
  const particles = new Float32Array(2 * PARTICLE_STRIDE);
  particles[0] = 10; particles[1] = 20; particles[2] = 30;
  particles[PARTICLE_STRIDE] = 40;
  return JSON.stringify({
    format: WORLD_SAVE_FORMAT,
    version: 1,
    name: 'legacy',
    savedAt: 1700000000000,
    tick: 42,
    worldSize: 200,
    particleCount: 2,
    speciesCount: 1,
    laws: { low: 1, high: 0 },
    worldParams: {},
    runtime: {},
    summary: {},
    particlesB64: encodeBase64(new Uint8Array(particles.buffer)),
    dnaB64: '',
  });
}

describe('world save compatibility (FSM-SAVE)', () => {
  it('the current version is 1 (bump only with a migration and this test)', () => {
    expect(WORLD_SAVE_VERSION).toBe(1);
  });

  it('loads a legacy v1 file and defaults the additive fields', () => {
    const state = parseWorldSave(legacyV1File());
    expect(state.tick).toBe(42);
    expect(state.particleCount).toBe(2);
    expect(state.laws).toEqual({ low: 1, high: 0, ext: 0, quad: 0 });
    expect(state.civilization).toBeNull();
    expect(state.codex).toBeNull();
    const view = new Float32Array(4 * PARTICLE_STRIDE);
    const out = restoreWorldState(state, { view });
    expect(out.particleCount).toBe(2);
    expect(Array.from(view.subarray(0, 3))).toEqual([10, 20, 30]);
    expect(view[PARTICLE_STRIDE]).toBe(40);
    expect(out.civilization).toBeNull();
    expect(out.codex).toBeNull();
  });

  it('ignores unknown fields from a same-version writer', () => {
    const data = JSON.parse(legacyV1File());
    data.someFutureAdditiveField = { hello: 'world' };
    expect(() => parseWorldSave(JSON.stringify(data))).not.toThrow();
  });

  it('rejects a newer version with a clear error on import and on restore', () => {
    const data = JSON.parse(legacyV1File());
    data.version = WORLD_SAVE_VERSION + 1;
    expect(() => parseWorldSave(JSON.stringify(data))).toThrow(/Unsupported world save version 2.*up to 1/);
    const state = parseWorldSave(legacyV1File());
    expect(() => restoreWorldState({ ...state, version: WORLD_SAVE_VERSION + 1 }, {})).toThrow(/Unsupported world save version/);
    expect(() => assertSupportedVersion('garbage')).toThrow();
    expect(() => assertSupportedVersion(undefined)).not.toThrow();
  });

  it('export/import round trip keeps the additive civilization and codex fields', () => {
    const view = new Float32Array(PARTICLE_STRIDE);
    const civ = { version: 1, tick: 3, cultures: [[1, { name: 'a' }]] };
    const codex = { entries: [['x', 1]] };
    const state = captureWorldState({ view, count: 1, civilization: civ, codex, tick: 3 });
    const back = parseWorldSave(exportWorldSave(state));
    expect(back.civilization).toEqual(civ);
    expect(back.codex).toEqual(codex);
  });
});
