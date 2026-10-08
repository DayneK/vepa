// D-028: tabbed MULTIPLEX setup screen. Presentation
// only — these tests pin that every control survives, lives in exactly one
// tab, and keeps its default.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { activateSettingsTab } from '../../src/ui/settingsTabs.js';
import { numberOr } from '../../src/multiplex/metricFormat.js';
import { MULTIPLEX_DEFAULTS } from '../../src/multiplex/multiplex.js';

const MPX_SRC = readFileSync(new URL('../../src/multiplex/multiplexUI.js', import.meta.url), 'utf8');

/** Minimal stand-in for the DOM bits activateSettingsTab touches. */
function fakeEl(attrs) {
  const classes = new Set(attrs.active ? ['active'] : []);
  return {
    dataset: { tab: attrs.tab }, hidden: !!attrs.hidden, tabIndex: 0, attrs: {},
    classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: (c) => classes.has(c) },
    setAttribute(k, v) { this.attrs[k] = v; },
  };
}
function fakeRoot(ids) {
  const tabs = ids.map((id, i) => fakeEl({ tab: id, active: i === 0 }));
  const panels = ids.map((id, i) => fakeEl({ tab: id, hidden: i !== 0 }));
  return { tabs, panels, querySelectorAll: (sel) => (sel.includes('tabpanel') ? panels : tabs) };
}

describe('activateSettingsTab', () => {
  it('shows exactly one panel and marks its tab selected', () => {
    const root = fakeRoot(['a', 'b', 'c']);
    expect(activateSettingsTab(root, 'b')).toBe('b');
    expect(root.panels.map((p) => p.hidden)).toEqual([true, false, true]);
    expect(root.tabs.map((t) => t.attrs['aria-selected'])).toEqual(['false', 'true', 'false']);
    expect(root.tabs[1].classList.contains('active')).toBe(true);
    expect(root.tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
  });
  it('ignores unknown tab ids', () => {
    const root = fakeRoot(['a', 'b']);
    expect(activateSettingsTab(root, 'zzz')).toBe(null);
    expect(root.panels.map((p) => p.hidden)).toEqual([false, true]);
  });
});

describe('MULTIPLEX setup screen tabs', () => {
  const start = MPX_SRC.indexOf('<div class="settings-tabs" role="tablist" aria-label="Multiplex settings">');
  const end = MPX_SRC.indexOf('<div class="chaos-modal-actions">', start);
  const body = MPX_SRC.slice(start, end);
  const panels = body.split('<div class="settings-tabpanel"').slice(1);

  it('has five tabs, each with one panel', () => {
    const tabs = [...body.matchAll(/role="tab" type="button" id="mpx-tab-(\w+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(['grid', 'breed', 'iterate', 'fitness', 'display']);
    expect(panels.length).toBe(5);
    expect(panels.map((p) => /data-tab="(\w+)"/.exec(p)[1])).toEqual(tabs);
    // Only the first panel starts visible.
    expect(panels.map((p) => /^[^>]*\shidden>/.test(p))).toEqual([false, true, true, true, true]);
  });

  // Defaults as shipped before D-028 (v9.1.27). A change here is a behaviour
  // change and needs a decision, not a layout tweak.
  const DEFAULTS = {
    'mpx-cols': '2', 'mpx-rows': '2', 'mpx-tps': '30', 'mpx-budget': '8', 'mpx-workers': 'checked',
    'mpx-per-sim': '0', 'mpx-pop-percent': '0', 'mpx-pop-scale': '1', 'mpx-substeps': '1', 'mpx-seed': '0',
    'mpx-spawn-species': '5', 'mpx-rand-laws': 'checked', 'mpx-rand-dna': 'checked', 'mpx-rand-pop': 'checked',
    'mpx-rand-params': 'checked', 'mpx-variation': '0.5', 'mpx-law-var': '1', 'mpx-dna-var': '1', 'mpx-pop-var': '1',
    'mpx-param-var': '1', 'mpx-drift': '0', 'mpx-cooling': '0', 'mpx-auto-iterate': 'unchecked', 'mpx-interval': '400',
    'mpx-adapt': 'unchecked', 'mpx-max-iters': '0', 'mpx-stag-limit': '5', 'mpx-keep-selected': 'unchecked',
    'mpx-elites': '0', 'mpx-hist-depth': '6', 'mpx-sim-speed': '1', 'mpx-paused': 'unchecked', 'mpx-eco': 'checked',
    'mpx-import-on-exit': 'checked',
    // D-030 (approved default change): REFILL TO CAP, on by default.
    'mpx-refill': 'checked',
  };
  const CONTROLS = [...Object.keys(DEFAULTS), 'mpx-preset', 'mpx-law-tier', 'mpx-light-laws', 'mpx-tick-mode', 'mpx-select-after', 'mpx-fit-metrics'];

  it('places every control in exactly one tab', () => {
    for (const id of CONTROLS) {
      const owners = panels.filter((p) => p.includes(`id="${id}"`));
      expect(owners.length, id).toBe(1);
    }
    expect(panels.filter((p) => p.includes('name="mpx-derive"')).length).toBe(1);
  });

  it('keeps every control default unchanged', () => {
    for (const [id, want] of Object.entries(DEFAULTS)) {
      const tag = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(body);
      expect(tag, id).toBeTruthy();
      if (want === 'checked' || want === 'unchecked') {
        expect(/\schecked[\s>]/.test(tag[0]) ? 'checked' : 'unchecked', id).toBe(want);
      } else {
        expect(/value="([^"]*)"/.exec(tag[0])[1], id).toBe(want);
      }
    }
    expect(body).toMatch(/name="mpx-derive" value="clone" checked/);
    expect(MULTIPLEX_DEFAULTS.lawVariation).toBe(1);
    expect(MULTIPLEX_DEFAULTS.deriveMode).toBe('clone');
    expect(MULTIPLEX_DEFAULTS.selectAfterIterate).toBe('none');
  });

  it('gives every setting row a long-press help entry', async () => {
    const { MULTIPLEX_HELP_DB } = await import('../../src/multiplex/multiplexHelp.js');
    const keys = new Set([...body.matchAll(/data-mpx-help="([\w-]+)"/g)].map((m) => m[1]));
    for (const k of keys) expect(MULTIPLEX_HELP_DB[k], k).toBeTruthy();
  });
});

describe('numberOr (variation sliders can reach 0%)', () => {
  it('keeps a deliberate 0 and only falls back for non-numbers', () => {
    expect(numberOr('0', 1)).toBe(0);
    expect(numberOr('0.35', 1)).toBe(0.35);
    expect(numberOr('', 1)).toBe(1);
    expect(numberOr('abc', 1)).toBe(1);
    expect(numberOr(undefined, 1)).toBe(1);
  });
});

