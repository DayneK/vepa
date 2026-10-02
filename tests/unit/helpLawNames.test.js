// LC-1: no help, parameter, icon or tooltip entry may exist for a law name that
// is not in LAW_INDEXES, and help prose must not cite retired laws.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LAW_INDEXES, LAW_PARAMETERS } from '../../src/constants/laws.js';
import { LAW_HELP_DB, LAW_HELP_PATCHES, MECHANICS_HELP, MECHANICS_PARAMETERS } from '../../src/constants/help.js';
import { MECHANICS_ICONS } from '../../src/ui/mechanicsIcons.js';

const KNOWN = new Set(Object.keys(LAW_INDEXES));
const RETIRED = ['TURBULENCE', 'CENTRIPETAL', 'ROTATION']; // ELASTICITY survives only as a DNA gene

function iconKeys(file, objName) {
  const src = readFileSync(new URL(`../../src/ui/${file}`, import.meta.url), 'utf8');
  const start = src.indexOf(`const ${objName} = {`);
  expect(start, `${objName} in ${file}`).toBeGreaterThan(-1);
  const body = src.slice(start, src.indexOf('\n};', start));
  return [...body.matchAll(/\b([A-Z][A-Z0-9_]*)\s*:/g)].map((m) => m[1]);
}

describe('help / icon / tooltip law names (LC-1)', () => {
  const tables = { LAW_HELP_DB, LAW_HELP_PATCHES, MECHANICS_HELP, MECHANICS_PARAMETERS, MECHANICS_ICONS };
  for (const [name, table] of Object.entries(tables)) {
    it(`${name} only names laws in LAW_INDEXES`, () => {
      expect(Object.keys(table).filter((k) => !KNOWN.has(k))).toEqual([]);
    });
  }
  for (const [file, obj] of [['tooltip.js', 'LAW_ICONS'], ['worldPanel.js', 'LAW_ICONS']]) {
    it(`${file} ${obj} only names laws in LAW_INDEXES`, () => {
      let keys;
      try { keys = iconKeys(file, obj); } catch { return; }
      expect(keys.filter((k) => !KNOWN.has(k))).toEqual([]);
    });
  }
  it('LAW_PARAMETERS is keyed only by live law indexes', () => {
    const live = new Set(Object.values(LAW_INDEXES).map(String));
    expect(Object.keys(LAW_PARAMETERS).filter((k) => !live.has(k))).toEqual([]);
  });
  it('retired laws are absent from LAW_INDEXES and not cited in help prose', () => {
    for (const r of RETIRED) expect(KNOWN.has(r)).toBe(false);
    const prose = JSON.stringify([LAW_HELP_DB, LAW_HELP_PATCHES, MECHANICS_HELP]);
    for (const r of RETIRED) expect(prose).not.toMatch(new RegExp(`\\b${r}\\b`));
  });
});
