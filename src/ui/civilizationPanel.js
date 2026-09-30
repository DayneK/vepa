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

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function createCivilizationPanel(bus) {
  const ctx = mountAnalyticsPanel(bus, {
    mountId: 'civilization-dashboard',
    title: 'CIVILIZATION',
    cells: [
      { id: 'civ-cultures', label: 'CULTURES' },
      { id: 'civ-federations', label: 'TRIBES' },
      { id: 'civ-polities', label: 'POLITIES' },
      { id: 'civ-kin', label: 'KIN EDGES' },
      { id: 'civ-structures', label: 'STRUCTURES' },
      { id: 'civ-regime', label: 'REGIME' },
      { id: 'civ-confidence', label: 'CONFIDENCE' },
      { id: 'civ-codex', label: 'CODEX' },
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

  // Sequel Phases 4-6. A missing sub-report (older save, or a registry the
  // boot path has not installed yet) renders as a dash rather than 0, so
  // "not measured yet" is never displayed as "measured as zero".
  const s = report.structures;
  setVal('civ-structures', s ? `${s.standing}/${s.total}` : '—');
  const regime = report.latestRegime;
  setVal('civ-regime', regime ? regime.regime : '—');
  setVal('civ-confidence', regime ? regime.confidence.toFixed(2) : '—');
  const codex = report.codex;
  setVal('civ-codex', codex ? `${codex.asserted}/${codex.entries}` : '—');

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
  if (s) {
    lines.push(`<div>· structures — ${s.standing} standing, ${s.dormant} dormant, ${s.collapsed} collapsed</div>`);
  }
  // The codex line is the observer's own statement about the world. It is
  // rendered with its evidence count so a reader can see how much is
  // actually behind it, rather than having to take the regime name on trust.
  if (report.codex) {
    const c = report.codex;
    const tag = c.wellEvidenced ? '' : ' (not enough evidence)';
    lines.push(`<div>· codex — ${esc(c.statement)}${tag}</div>`);
    lines.push(`<div>· evidence — ${c.evidence} item(s), confidence ${c.confidence.toFixed(2)}, `
      + `${c.asserted} stated / ${c.admitted} uncertain</div>`);
  }
  if (c.refused) {
    lines.push(`<div>· codex declined to explain — ${esc(c.refused)}</div>`);
  }
  log.innerHTML = lines.length ? lines.join('') : '<div>no civilization entities yet</div>';
}

export { setCellValue };
