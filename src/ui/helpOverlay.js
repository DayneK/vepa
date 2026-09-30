/**
 * VEPA4 — Long-press help overlay for tabs, graphs and analytics cells.
 *
 * One delegated gesture serves two surfaces, because the two kinds of "what is
 * this?" answer different questions:
 *
 *   - A tab or sub-tab opens a MODAL. Tabs carry whole subsystems with several
 *     interacting parts; a tooltip the width of a 28px emoji cannot hold that,
 *     and a modal can be read at leisure without losing your place.
 *   - A graph or analytics cell shows a TOOLTIP anchored to the thing itself.
 *     You are looking *at* the graph while asking about it, so the answer has
 *     to sit next to it and then get out of the way.
 *
 * Gesture contract (matches the existing long-press idiom in paramHelp.js and
 * multiplexHelp.js — 500ms, cancelled by movement):
 *
 *   pointerdown → wait LONG_PRESS_MS → surface shown
 *   move > MOVE_TOLERANCE px → cancel (so a scroll or a drag never misfires)
 *   release → tooltip stays until dismissed; modal stays until closed
 *   right-click → same help, immediately
 *
 * The press is *not* swallowed for tabs: a long-press that turns into a help
 * modal must not also switch tabs behind the modal, so the synthetic click is
 * suppressed — but only when a help surface actually opened.
 *
 * Clicking the overlay backdrop, pressing Escape, or clicking ✕ closes it. All
 * listeners are registered once at init and are idempotent.
 */

import { helpForTab, helpForGraph } from './helpRegistry.js';

/** Hold duration that counts as a long press. */
export const HELP_LONG_PRESS_MS = 500;
/** Movement in px that cancels a pending long press. */
export const HELP_MOVE_TOLERANCE = 10;
/** Delay before an unfocused tooltip dismisses itself. */
export const HELP_TOOLTIP_LINGER_MS = 1600;

let modalEl = null;
let tooltipEl = null;
let initialised = false;
let pressTimer = null;
let pressX = 0;
let pressY = 0;
let suppressNextClick = false;
let lingerTimer = null;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sectionHtml(entry) {
  if (!entry.sections || !entry.sections.length) return '';
  return entry.sections
    .map(([label, body]) => (
      `<div class="help-drone-section"><strong>${esc(label)}</strong><span>${esc(body)}</span></div>`
    ))
    .join('');
}

/**
 * Resolve what a pointer hit means for help purposes.
 * Tabs win over graphs: a sub-tab button is not inside a chart.
 */
function resolve(target) {
  if (!target || !target.closest) return null;
  const tabBtn = target.closest('#main-panel .tab-btn[data-tab]');
  if (tabBtn) {
    const entry = helpForTab(tabBtn.dataset.tab);
    return entry ? { entry, surface: 'modal', target: tabBtn } : null;
  }
  const subTabBtn = target.closest('#main-panel .sub-tab-btn[data-sub]');
  if (subTabBtn) {
    const entry = helpForTab(subTabBtn.dataset.sub);
    return entry ? { entry, surface: 'modal', target: subTabBtn, scope: 'subtab' } : null;
  }
  const graph = helpForGraph(target);
  // Anchor the tooltip to the element the help is about, not to whatever
  // child of it happened to be under the pointer.
  const anchor = graph && graph.scope === 'cell'
    ? (target.closest('.intel-cell') || target)
    : (target.closest('canvas') || target.closest('.chart-section') || target);
  return graph ? { entry: graph, surface: 'tooltip', target: anchor } : null;
}

/* ── Modal ────────────────────────────────────────────────────────────── */

/** Close the help modal if one is open. */
export function closeHelpModal() {
  if (modalEl) {
    modalEl.remove();
    modalEl = null;
    document.removeEventListener('keydown', onModalKey);
  }
}

/** True when a help modal is currently open. */
export function isHelpModalOpen() {
  return modalEl !== null;
}

function onModalKey(event) {
  if (event.key === 'Escape') closeHelpModal();
}

/**
 * Show a help modal for a tab or sub-tab.
 * @param {{title:string, icon?:string, summary:string, sections:Array}} entry
 * @param {{kind?:string}} [meta]
 */
export function showHelpModal(entry, meta = {}) {
  if (!entry) return null;
  closeHelpModal();
  hideHelpTooltip();

  const el = document.createElement('div');
  el.id = 'tab-help-overlay';
  // Reuses the help-drone shell so long-press help and the drone's own map
  // are visually one system rather than two competing ones.
  el.className = 'help-drone-overlay tab-help-overlay';
  const where = meta.scope === 'subtab' ? 'SUB-TAB' : 'TAB';
  el.innerHTML = `
    <section class="help-drone-panel" role="dialog" aria-modal="true" aria-labelledby="tab-help-title">
      <header class="help-drone-header">
        <div><span class="help-drone-signal">◉</span>
          <span id="tab-help-title">${esc(entry.icon || '')} ${esc(entry.title)}</span></div>
        <button class="help-drone-close" type="button" aria-label="Dismiss help">×</button>
      </header>
      <div class="help-drone-body">
        <span class="tab-help-kind">${esc(where)}</span>
        <p class="help-drone-lead">${esc(entry.summary)}</p>
        <div class="help-drone-mapping tab-help-sections">${sectionHtml(entry)}</div>
        <div class="help-drone-footer">VEPA4 · long-press a graph for its own help</div>
      </div>
    </section>`;
  document.body.appendChild(el);

  el.querySelector('.help-drone-close').addEventListener('click', closeHelpModal);
  el.addEventListener('click', (event) => {
    if (event.target === el) closeHelpModal();
  });
  document.addEventListener('keydown', onModalKey);
  modalEl = el;
  return el;
}

/* ── Tooltip ──────────────────────────────────────────────────────────── */

/** Dismiss the graph tooltip. */
export function hideHelpTooltip() {
  if (lingerTimer) {
    clearTimeout(lingerTimer);
    lingerTimer = null;
  }
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
}

/** True when a graph tooltip is currently shown. */
export function isHelpTooltipVisible() {
  return tooltipEl !== null;
}

/**
 * Show a tooltip anchored to a graph or analytics cell.
 *
 * @param {HTMLElement} target the element to point at
 * @param {{title:string, summary:string, sections:Array, kind?:string}} entry
 * @param {{sticky?:boolean}} [opts] sticky keeps it up until dismissed
 * @returns {HTMLElement|null}
 */
export function showHelpTooltip(target, entry, opts = {}) {
  if (!target || !entry) return null;
  hideHelpTooltip();

  const tip = document.createElement('div');
  tip.className = 'help-drone-tip tab-help-tip';
  tip.setAttribute('role', 'status');
  const sections = sectionHtml(entry);
  tip.innerHTML = `<strong>${esc(entry.title)}</strong>`
    + `<span>${esc(entry.summary)}</span>`
    + (sections ? `<div class="tab-help-tip-sections">${sections}</div>` : '');
  document.body.appendChild(tip);

  const rect = target.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  // Prefer above the element; flip below when there is no room.
  const preferAbove = rect.top > h + 16;
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, rect.left))}px`;
  tip.style.top = preferAbove
    ? `${Math.max(8, rect.top - h - 10)}px`
    : `${Math.min(window.innerHeight - h - 8, rect.bottom + 10)}px`;

  if (!opts.sticky) {
    lingerTimer = setTimeout(hideHelpTooltip, HELP_TOOLTIP_LINGER_MS);
  }
  tooltipEl = tip;
  return tip;
}

/* ── Wiring ───────────────────────────────────────────────────────────── */

function cancelPendingPress() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

/**
 * Wire the long-press help gesture across the whole document.
 *
 * Delegated, so graphs and cells created later (every analytics panel builds
 * its DOM at mount time) are covered without being re-registered. Safe to call
 * more than once.
 */
export function initHelpLongPress(root = document.body) {
  if (initialised || !root) return false;
  initialised = true;

  root.addEventListener('pointerdown', (event) => {
    // Right-click is handled by its own event below.
    if (event.button === 2) return;
    cancelPendingPress();
    const hit = resolve(event.target);
    if (!hit) return;
    pressX = event.clientX;
    pressY = event.clientY;
    pressTimer = setTimeout(() => {
      pressTimer = null;
      suppressNextClick = true;
      if (hit.surface === 'modal') showHelpModal(hit.entry, { scope: hit.scope || 'tab' });
      else showHelpTooltip(hit.target, hit.entry);
    }, HELP_LONG_PRESS_MS);
  });

  root.addEventListener('pointermove', (event) => {
    if (!pressTimer) return;
    const dx = event.clientX - pressX;
    const dy = event.clientY - pressY;
    if (dx * dx + dy * dy > HELP_MOVE_TOLERANCE * HELP_MOVE_TOLERANCE) cancelPendingPress();
  });

  for (const type of ['pointerup', 'pointercancel']) {
    root.addEventListener(type, cancelPendingPress);
  }

  // A long-press that opened help must not also perform the tap action, or the
  // tab switches out from under the modal that is explaining it.
  root.addEventListener('click', (event) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // Right-click gives the same help immediately, matching paramHelp.js so the
  // two help surfaces are learnable as one gesture.
  root.addEventListener('contextmenu', (event) => {
    const hit = resolve(event.target);
    if (!hit) return;
    event.preventDefault();
    cancelPendingPress();
    if (hit.surface === 'modal') showHelpModal(hit.entry, { scope: hit.scope || 'tab' });
    else showHelpTooltip(hit.target, hit.entry, { sticky: true });
  });

  document.addEventListener('scroll', hideHelpTooltip, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideHelpTooltip();
  });

  return true;
}

/** Test seam: whether initHelpLongPress has already run. */
export function isHelpLongPressInitialised() {
  return initialised;
}