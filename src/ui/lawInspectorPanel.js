// LRA-10 (AC-38): dev-only law inspector. Renders inspectLaw()/exportLawGraph()
// as a floating panel: pick a law, see its category, outgoing and incoming
// relationships and declared reads/writes, and copy the graph as JSON.
//
// Mounted only from the DEV block in main.js and only when the page URL has
// `?lawInspector` (or `#lawInspector`), so default UI behaviour — dev or
// production — is unchanged. Production builds strip the import entirely.
import { inspectLaw, exportLawGraph, exportLawGraphJson } from '../physics/lawGraph.js';
import { escapeHtml } from './html.js';

export const LAW_INSPECTOR_FLAG = 'lawInspector';

/** Mount gate: dev build AND explicit opt-in flag in the URL. */
export function shouldMountLawInspector({ dev, search = '', hash = '' } = {}) {
  if (!dev) return false;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.has(LAW_INSPECTOR_FLAG) || hash.replace(/^#/, '') === LAW_INSPECTOR_FLAG;
}

const list = (items) => (items && items.length ? items.map((x) => `<code>${escapeHtml(String(x))}</code>`).join(' ') : '<em>none</em>');

/** HTML for one law's inspector record. Pure; exported for tests. */
export function renderLawDetail(record) {
  const rel = record.relationships || {};
  const rows = Object.keys(record.incoming).map((type) =>
    `<tr data-rel="${escapeHtml(type)}"><th>${escapeHtml(type)}</th><td class="out">${list(Array.isArray(rel[type]) ? rel[type] : [])}</td><td class="in">${list(record.incoming[type])}</td></tr>`).join('');
  return `<h4 class="law-name">${escapeHtml(record.name)} <small>#${record.id} · ${escapeHtml(record.category || '?')}</small></h4>`
    + `<p class="io">reads ${list(rel.reads)} · writes ${list(rel.writes)}</p>`
    + `<table><thead><tr><th>relation</th><th>outgoing</th><th>incoming</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** Build the panel element (not attached). */
export function createLawInspectorPanel(doc, { initialLaw } = {}) {
  const graph = exportLawGraph();
  const root = doc.createElement('div');
  root.setAttribute('id', 'law-inspector');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Law inspector (dev)');
  root.style = Object.assign(root.style || {}, { position: 'fixed', right: '8px', bottom: '8px', zIndex: 9999, maxHeight: '60vh', overflow: 'auto', background: 'rgba(10,12,20,.92)', color: '#dde', font: '12px monospace', padding: '8px', width: '420px' });
  const options = graph.laws.map((l) => `<option value="${escapeHtml(l.name)}">${escapeHtml(l.category)} / ${escapeHtml(l.name)}</option>`).join('');
  root.innerHTML = `<div class="hdr"><strong>Law inspector</strong> <span class="count">${graph.lawCount} laws</span> <button type="button" class="copy-json">Copy graph JSON</button></div>`
    + `<select class="law-select">${options}</select><div class="law-detail"></div>`;
  const select = root.querySelector('.law-select');
  const detail = root.querySelector('.law-detail');
  const show = (name) => { detail.innerHTML = renderLawDetail(inspectLaw(name)); select.value = name; root.dataset.law = name; };
  select.addEventListener('change', () => show(select.value));
  root.querySelector('.copy-json').addEventListener('click', () => {
    const json = exportLawGraphJson();
    root.dataset.copied = String(json.length);
    globalThis.navigator?.clipboard?.writeText?.(json);
  });
  show(initialLaw || graph.laws[0].name);
  return { root, show };
}

/** Mount into document.body if the gate allows; returns the panel or null. */
export function mountLawInspector(doc, gate) {
  if (!shouldMountLawInspector(gate)) return null;
  const panel = createLawInspectorPanel(doc);
  doc.body.appendChild(panel.root);
  return panel;
}
