/**
 * VEPA4 — Civilization analytics panel
 *
 * Renders the culture / kin / federation / polity ontology produced by
 * src/state/civilization.js. Built entirely on the shared analytics panel
 * shell (src/ui/analyticsPanel.js) — the same abstraction the ECO and
 * CIVILIZATIONS dashboards use, so there is no per-panel scaffolding left.
 */

import { mountAnalyticsPanel } from './analyticsPanel.js';
import { setCellValue } from './analyticsPanel.js';

let host = null;

export function createCivilizationPanel(bus) {
  const ctx = mountAnalyticsPanel(bus, {
    mountId: 'civilization-dashboard',
    title: 'CIVILIZATION',
    cells: [
      { id: 'civ-cultures', label: 'CULTURES' },
      { id: 'civ-federations', label: 'TRIBES' },
      { id: 'civ-polities', label: 'POLITIES' },
      { id: 'civ-kin', label: 'KIN EDGES' },
    ],
    logs: ['civ-detail'],
    subscribe: (b, deliver) => b.on('civilization:analytics', ({ report }) => deliver(report)),
    draw: (c, report) => draw(c, report),
  });
  if (ctx) host = ctx.host;
  return ctx;
}

function draw(ctx, report) {
  host = ctx.host;
  const setVal = ctx.setVal;
  setVal('civ-cultures', report.cultures);
  setVal('civ-federations', report.federations);
  setVal('civ-polities', report.polities);
  setVal('civ-kin', report.kinEdges);

  const log = host.querySelector('#civ-detail');
  if (!log) return;

  const lines = [];
  for (const c of report.detail.cultures) {
    lines.push(`<div>· ${c.name || c.ownerGroupId} — ${c.symbols} symbols, ${c.norms} norms, cohesion ${(c.cohesion ?? 1).toFixed(2)}</div>`);
  }
  for (const f of report.detail.federations) {
    lines.push(`<div>· ${f.name} (${f.kind}) — ${f.members} groups, ${f.edges} bonds, gen ${f.generation}</div>`);
  }
  for (const p of report.detail.polities) {
    lines.push(`<div>· ${p.name} — ${p.citizens} citizens, ${p.provinces} provinces, ${p.institutions.length} institutions, term ${p.term}</div>`);
  }
  if (report.households) lines.push(`<div>· ${report.households} households</div>`);
  log.innerHTML = lines.length ? lines.join('') : '<div>no civilization entities yet</div>';
}

export { setCellValue };
