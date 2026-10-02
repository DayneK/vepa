// CG-1: LAW_HELP_PATCHES and the MECHANICS_HELP overlay were folded into the
// canonical LAW_HELP_DB. Every law's help text must equal the merged text the
// runtime produced before the fold (snapshot taken at 8512f4c+).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { LAW_HELP_DB } from '../../src/constants/help.js';
import { LAW_INDEXES } from '../../src/constants/laws.js';

const snapshot = JSON.parse(readFileSync(new URL('../fixtures/lawHelpMerged.snapshot.json', import.meta.url), 'utf8'));

describe('help catalogue fold (CG-1)', () => {
  it('lawHelpPatches.js is gone and help.js has no runtime merge loop', () => {
    expect(existsSync(new URL('../../src/state/lawHelpPatches.js', import.meta.url))).toBe(false);
    const src = readFileSync(new URL('../../src/constants/help.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/for\s*\(const\s*\[[^\]]*\]\s*of\s*Object\.entries/);
    expect(src).not.toMatch(/lawHelpPatches/);
  });
  it('every law keeps exactly its pre-fold merged help text', () => {
    expect(Object.keys(LAW_HELP_DB).sort()).toEqual(Object.keys(snapshot).sort());
    for (const [name, help] of Object.entries(snapshot)) expect(LAW_HELP_DB[name], name).toEqual(help);
  });
  it('covers all 136 laws', () => {
    expect(Object.keys(LAW_HELP_DB).length).toBe(Object.keys(LAW_INDEXES).length);
  });
});
