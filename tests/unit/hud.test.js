import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatTickStats, formatPopulation, createHUD } from '../../src/ui/hud.js';
import { installDom, makeEl } from '../helpers/domStub.js';

describe('HUD telemetry', () => {
  it('keeps total tick count beside the render frame rate', () => {
    expect(formatTickStats(1234, 59.96)).toBe('1,234\n60.0');
  });

  it('normalizes an uninitialized tick value', () => {
    expect(formatTickStats(-1, 0)).toBe('0\n0.0');
  });

  it('formats the population with thousands separators and never negative', () => {
    expect(formatPopulation(12345)).toBe('12,345');
    expect(formatPopulation(-3)).toBe('0');
    expect(formatPopulation(undefined)).toBe('0');
  });
});

describe('top bar layout (D-025): "#### •  tick/fps"', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const center = html.slice(html.indexOf('<div class="toolbar-center">'), html.indexOf('<div class="toolbar-right">'));

  it('puts the population number left of the status dot, then the tick/fps stack', () => {
    const count = center.indexOf('id="hud-population-count"');
    const dot = center.indexOf('id="hud-particles"');
    const tick = center.indexOf('id="hud-tick"');
    expect(count).toBeGreaterThan(-1);
    expect(count).toBeLessThan(dot);
    expect(dot).toBeLessThan(tick);
    // Initial tick/fps text is two real lines (not a literal backslash-n).
    expect(center).not.toContain('0\\n0.0');
    expect(center).toMatch(/id="hud-tick"[^>]*>0\n0\.0</);
  });

  it('draws the status dot as a small circle with equal sides and no count painted inside', () => {
    const css = readFileSync(new URL('../../style.css', import.meta.url), 'utf8') + readFileSync(new URL('../../src/ui/toolbarHelp.css', import.meta.url), 'utf8');
    const rules = [...css.matchAll(/\.hud-(?:population-orb|particles)\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(rules.length).toBeGreaterThan(0);
    for (const body of rules) {
      const w = body.match(/\bwidth:\s*(\d+)px/), h = body.match(/\bheight:\s*(\d+)px/);
      if (w || h) { expect(w && w[1]).toBe(h && h[1]); expect(Number(w[1])).toBeLessThanOrEqual(10); }
      expect(body).not.toMatch(/min-width:\s*[1-9]/);
    }
    expect(css).not.toMatch(/\.hud-population-orb::after/);
    expect(css).toMatch(/\.hud-tick-compact\s*\{[^}]*white-space:\s*pre-line/);
  });
});

describe('createHUD population readout', () => {
  let doc, handlers;
  beforeEach(() => {
    doc = installDom();
    globalThis.requestAnimationFrame = () => 0;
    for (const id of ['hud-population-count', 'hud-particles', 'hud-tick']) { const e = makeEl('span', doc); e.setAttribute('id', id); e.style = { props: {}, setProperty(k, v) { this.props[k] = v; } }; doc.body.appendChild(e); }
    handlers = {};
    createHUD({ on: (type, fn) => { (handlers[type] ||= []).push(fn); } });
  });
  const emit = (type, payload) => (handlers[type] || []).forEach((fn) => fn(payload));

  it('shows the buffer count until metrics arrive, then the alive population', () => {
    emit('physics:tick', { tick: 5, particleCount: 1200, speciesCount: 5 });
    expect(doc.getElementById('hud-population-count').textContent).toBe('1,200');
    expect(doc.getElementById('hud-tick').textContent).toMatch(/^5\n\d+\.\d$/);
    emit('sim:metrics', { populationAlive: 930 });
    expect(doc.getElementById('hud-population-count').textContent).toBe('930');
    emit('physics:tick', { tick: 6, particleCount: 1201 });
    expect(doc.getElementById('hud-population-count').textContent).toBe('930');
    expect(doc.getElementById('hud-particles').getAttribute('aria-label')).toBe('Population indicator: 930 active entities');
  });

  it('drops a stale alive count when the world restarts smaller', () => {
    emit('physics:tick', { tick: 1, particleCount: 1200 });
    emit('sim:metrics', { populationAlive: 930 });
    emit('physics:tick', { tick: 1, particleCount: 300 });
    expect(doc.getElementById('hud-population-count').textContent).toBe('300');
  });
});
