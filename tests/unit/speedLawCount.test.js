// D-036: multiplex LAW COUNT slider (replaces the D-034 Full fidelity light-laws switch).
import { describe, it, expect } from 'vitest';
import { LAW_COUNT, LAW_INDEXES } from '../../src/constants.js';
import { LAW_PRIORITY, LIGHT_LAW_COUNT, sanitizeLawCount, lawCountMask } from '../../src/multiplex/lawRanking.js';
import { DEFAULT_LIGHT_LAWS, lawMaskFor } from '../../src/multiplex/previewLaws.js';
import { MULTIPLEX_DEFAULTS } from '../../src/multiplex/multiplex.js';
import { PERSISTED_KEYS, sanitizeMultiplexSettings } from '../../src/multiplex/multiplexSettings.js';
import { MULTIPLEX_HELP_DB as MULTIPLEX_HELP } from '../../src/multiplex/multiplexHelp.js';

const words = (m) => [m.lowFlags[0], m.highFlags[0], m.extFlags[0], m.quadFlags[0], m.pentaFlags[0]];

describe('LAW COUNT ranking', () => {
  it('lists every law once, light set first, life/energy/repro leading', () => {
    expect(LAW_PRIORITY.length).toBe(LAW_COUNT);
    expect(new Set(LAW_PRIORITY).size).toBe(LAW_COUNT);
    for (const l of LAW_PRIORITY) expect(LAW_INDEXES[l], l).toBeTypeOf('number');
    expect(LIGHT_LAW_COUNT).toBe(16);
    expect([...LAW_PRIORITY.slice(0, 16)].sort()).toEqual([...DEFAULT_LIGHT_LAWS].sort());
    expect(LAW_PRIORITY.slice(0, 3)).toEqual(['LIFE', 'ENERGY', 'REPRO']);
  });
  it('16 = the light set mask; 136 = every law', () => {
    expect(words(lawCountMask(16))).toEqual(words(lawMaskFor(DEFAULT_LIGHT_LAWS)));
    expect(words(lawCountMask(LAW_COUNT))).toEqual(words(lawMaskFor(Object.keys(LAW_INDEXES))));
  });
  it('sanitizes to 1…136 (non-numbers → 136)', () => {
    expect([sanitizeLawCount(0), sanitizeLawCount(500), sanitizeLawCount('x'), sanitizeLawCount(40.4)]).toEqual([1, LAW_COUNT, LAW_COUNT, 40]);
  });
});

describe('LAW COUNT setting', () => {
  it('defaults to every law and is persisted', () => {
    expect(MULTIPLEX_DEFAULTS.lawCount).toBe(LAW_COUNT);
    expect(PERSISTED_KEYS).toContain('lawCount');
    expect(PERSISTED_KEYS).not.toContain('fullFidelityLight');
    expect(sanitizeMultiplexSettings({ lawCount: 40 }).lawCount).toBe(40);
    expect(sanitizeMultiplexSettings({}).lawCount).toBeUndefined();
  });
  it('migrates the D-034 "Full fidelity · light laws" switch to 16', () => {
    expect(sanitizeMultiplexSettings({ fullFidelityLight: true }).lawCount).toBe(16);
    expect(sanitizeMultiplexSettings({ fullFidelityLight: false }).lawCount).toBeUndefined();
  });
  it('has help text that says it changes results', () => {
    expect(MULTIPLEX_HELP.lawCount.explanation).toMatch(/CHANGES RESULTS/);
  });
});
