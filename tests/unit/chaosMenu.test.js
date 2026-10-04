// D-028: tabbed CHAOS CONTROL menu — same actions, same default categories.
import { describe, it, expect } from 'vitest';
import { buildChaosMenuHTML, CHAOS_MENU_CATEGORIES, CHAOS_MENU_TABS } from '../../src/ui/chaosMenu.js';
import { LAW_CATEGORIES } from '../../src/constants/laws.js';

describe('CHAOS CONTROL menu tabs', () => {
  const html = buildChaosMenuHTML();
  it('has the three tabs, first one visible', () => {
    expect(CHAOS_MENU_TABS.map((t) => t.id)).toEqual(['selective', 'multiplex', 'tap']);
    for (const t of CHAOS_MENU_TABS) expect(html).toContain(`id="chaos-panel-${t.id}"`);
    expect(html).toMatch(/id="chaos-panel-selective" data-tab="selective" aria-labelledby="chaos-tab-selective">/);
    expect(html).toMatch(/id="chaos-panel-multiplex"[^>]*hidden>/);
    expect(html).toMatch(/id="chaos-panel-tap"[^>]*hidden>/);
  });
  it('lists every law category and keeps the original five checked by default', () => {
    const listed = [...html.matchAll(/data-cat="(\w+)"( checked)?/g)];
    expect(listed.map((m) => m[1]).sort()).toEqual(Object.keys(LAW_CATEGORIES).sort());
    expect(listed.filter((m) => m[2]).map((m) => m[1])).toEqual(['physics', 'biology', 'chemistry', 'thermodynamics', 'metaphysics']);
    expect(CHAOS_MENU_CATEGORIES.length).toBe(Object.keys(LAW_CATEGORIES).length);
  });
  it('keeps every original action', () => {
    for (const a of ['multiplex', 'randomize', 'clear', 'close']) expect(html).toContain(`data-action="${a}"`);
  });
});
