// CA-A8: dashboards with intel-grid value cells share the analytics shell or
// its setter; intelPanel has no private setter; its DOM ids are unchanged.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const UI = new URL('../../src/ui/', import.meta.url);
const read = (f) => readFileSync(new URL(f, UI), 'utf8');

describe('analytics panels (CA-A8)', () => {
  it('intelPanel uses the shared setCellValue and has no private setter', () => {
    const src = read('intelPanel.js');
    expect(src).toMatch(/import \{ setCellValue \} from '\.\/analyticsPanel\.js'/);
    expect(src).not.toMatch(/function setValue\b|function setVal\b/);
  });
  it('intelPanel DOM ids are unchanged', () => {
    const ids = [...read('intelPanel.js').matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(ids).toEqual([
      'intel-births', 'intel-clear-btn', 'intel-cluster-energy', 'intel-clusters', 'intel-deaths',
      'intel-goal-log', 'intel-largest', 'intel-lineage', 'intel-net', 'intel-rec', 'intel-record-btn',
      'intel-scrub', 'intel-snapshots',
    ]);
  });
  it('every panel module that renders intel-value cells uses the shell or the shared setter', () => {
    const panels = readdirSync(UI).filter((f) => f.endsWith('.js') && f !== 'analyticsPanel.js');
    const offenders = panels.filter((f) => {
      const src = read(f);
      const rendersCells = /class="intel-value"/.test(src) || /mountAnalyticsPanel\(/.test(src);
      return rendersCells && !/mountAnalyticsPanel|setCellValue/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
