// D-034 speed option 1: Full fidelity preset with the light law set.
import { describe, it, expect } from 'vitest';
import { MULTIPLEX_DEFAULTS, MULTIPLEX_PRESETS, applyMultiplexPreset } from '../../src/multiplex/multiplex.js';
import { sanitizeMultiplexSettings, PERSISTED_KEYS } from '../../src/multiplex/multiplexSettings.js';
import { MULTIPLEX_HELP_DB as MULTIPLEX_HELP } from '../../src/multiplex/multiplexHelp.js';

describe('Full fidelity · light laws (D-034 option 1)', () => {
  it('is off by default, so Full fidelity keeps full laws (unchanged)', () => {
    expect(MULTIPLEX_DEFAULTS.fullFidelityLight).toBe(false);
    expect(applyMultiplexPreset({ ...MULTIPLEX_DEFAULTS }, 'full-fidelity').lawTier).toBe('full');
    expect(applyMultiplexPreset({}, 'full-fidelity').lawTier).toBe(MULTIPLEX_PRESETS['full-fidelity'].lawTier);
  });
  it('switches Full fidelity to the light law set when on, keeping grid and population', () => {
    const on = applyMultiplexPreset({ fullFidelityLight: true }, 'full-fidelity');
    const off = applyMultiplexPreset({ fullFidelityLight: false }, 'full-fidelity');
    expect(on.lawTier).toBe('light');
    expect({ ...on, lawTier: 'full', fullFidelityLight: false }).toEqual(off);
  });
  it('does not affect the other presets', () => {
    for (const id of ['smooth-20', 'balanced']) {
      const { fullFidelityLight, ...a } = applyMultiplexPreset({ fullFidelityLight: true }, id);
      const { fullFidelityLight: _, ...b } = applyMultiplexPreset({ fullFidelityLight: false }, id);
      expect(a).toEqual(b);
    }
  });
  it('is saved with the multiplex settings and sanitised to a boolean', () => {
    expect(PERSISTED_KEYS).toContain('fullFidelityLight');
    expect(sanitizeMultiplexSettings({ fullFidelityLight: true }).fullFidelityLight).toBe(true);
    expect(sanitizeMultiplexSettings({ fullFidelityLight: 'yes' }).fullFidelityLight).toBe(false);
    expect(sanitizeMultiplexSettings({}).fullFidelityLight).toBeUndefined();
  });
  it('has help text that says it changes results', () => {
    expect(MULTIPLEX_HELP.fullFidelityLight.explanation).toMatch(/CHANGES RESULTS/);
  });
});
