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

/**
 * Build the detail-log lines for a civilization report.
 *
 * Split out from `draw` so the formatting can be tested without a DOM. This
 * module previously inlined all of it, and a block-scoped `const` leaked one
 * line past its `if` — a ReferenceError that `node --check` cannot see and
 * that the suite missed because nothing ever called `draw`. Keeping the string
 * building pure means that class of bug now fails a test.
 *
 * @param {object} report a `civilizationReport()` payload plus the sequel
 *   sub-reports (`structures`, `latestRegime`, `codex`)
 * @returns {string[]} HTML fragments, in display order
 */
export function formatCivilizationLines(report) {
  const lines = [];
  const detail = (report && report.detail) || {};

  for (const culture of detail.cultures || []) {
    lines.push(`<div>· ${culture.name || culture.ownerGroupId} — ${culture.symbols} symbols, `
      + `${culture.norms} norms, cohesion ${(culture.cohesion ?? 1).toFixed(2)}</div>`);
  }
  for (const fed of detail.federations || []) {
    lines.push(`<div>· ${fed.name} (${fed.kind}) — ${fed.members} groups, ${fed.edges} bonds, gen ${fed.generation}</div>`);
  }
  for (const polity of detail.polities || []) {
    lines.push(`<div>· ${polity.name} — ${polity.citizens} citizens, ${polity.provinces} provinces, `
      + `${polity.institutions.length} institutions, term ${polity.term}</div>`);
  }
  if (report.households) lines.push(`<div>· ${report.households} households</div>`);

  // Sequel Phases 4-6. Each sub-report is optional: a save written before a
  // phase existed simply omits it, and "not measured yet" must not render as
  // a measured zero.
  const structures = report.structures;
  if (structures) {
    lines.push(`<div>· structures — ${structures.standing} standing, ${structures.dormant} dormant, ${structures.collapsed} collapsed</div>`);
  }

  // The codex line is the observer's own statement about the world, rendered
  // with its evidence count so a reader can see how much is actually behind
  // it rather than having to take the regime name on trust.
  const codex = report.codex;
  if (codex) {
    const tag = codex.wellEvidenced ? '' : ' (not enough evidence)';
    lines.push(`<div>· codex — ${esc(codex.statement)}${tag}</div>`);
    lines.push(`<div>· evidence — ${codex.evidence} item(s), confidence ${codex.confidence.toFixed(2)}, `
      + `${codex.asserted} stated / ${codex.admitted} uncertain</div>`);
    // A refusal is surfaced rather than swallowed: silence would read as
    // "nothing to report" when it actually means "the guard declined".
    if (codex.refused) {
      lines.push(`<div>· codex declined to explain — ${esc(codex.refused)}</div>`);
    }
  }

  return lines;
}

function draw(ctx, report) {
  host = ctx.host;
  const setVal = ctx.setVal;
  setVal('civ-cultures', report.cultures);
  setVal('civ-federations', report.federations);
  setVal('civ-polities', report.polities);
  setVal('civ-kin', report.kinEdges);

  const structures = report.structures;
  setVal('civ-structures', structures ? `${structures.standing}/${structures.total}` : '—');
  const regime = report.latestRegime;
  setVal('civ-regime', regime ? regime.regime : '—');
  setVal('civ-confidence', regime ? regime.confidence.toFixed(2) : '—');
  const codex = report.codex;
  setVal('civ-codex', codex ? `${codex.asserted}/${codex.entries}` : '—');

  const log = host.querySelector('#civ-detail');
  if (!log) return;

  const lines = formatCivilizationLines(report);
  log.innerHTML = lines.length ? lines.join('') : '<div>no civilization entities yet</div>';
}

export { setCellValue };
