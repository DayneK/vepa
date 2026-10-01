/**
 * VEPA4 — Narrative / Log Panel (DATA > 📜 LOGS)
 *
 * Scrollback for everything the world says about itself. Entries render newest
 * first and the view follows the newest entry until you scroll away from it,
 * at which point it stops yanking you back and keeps your reading position.
 *
 * New in v9.1.29:
 *
 *  - **Batched.** Entries arrive through `narrative:batch`, produced by
 *    `src/core/logQueue.js`. The panel used to build one node per
 *    `narrative:entry`, which on a chatty world meant a layout and a
 *    `scrollHeight` read per line.
 *  - **Filter chips with counts.** Every voice gets a chip that says how many
 *    entries it holds, and a filter that applies retroactively — the log is a
 *    ring of entries, not a wall of DOM.
 *  - **Paused autoscroll.** The pin state is visible rather than inferred.
 */

import { escapeHtml } from './html.js';
import { createLogQueue } from '../core/logQueue.js';

const MAX_ENTRIES = 100;

const VOICE_COLORS = {
  Stabilizer: 'var(--accent-blue)',
  Diverger:   'var(--accent-red)',
  Observer:   'var(--accent-green)',
  Dissolver:  'var(--accent-purple)',
};

const DEFAULT_VOICE_COLOR = 'var(--text-secondary)';

/** Chip order. `ALL` is a view, not a voice, so it is prepended at render time. */
const VOICES = ['System', 'Observer', 'Stabilizer', 'Diverger', 'Dissolver'];

/** Entries within this many pixels of the newest are treated as "following". */
const PIN_THRESHOLD_PX = 24;

let container = null;
let chipsEl = null;
let pinEl = null;
let entries = [];
let activeVoice = 'ALL';
let follow = true;
let queue = null;

/**
 * The category an entry belongs to.
 *
 * `voice` is the narrator's name; anything unrecognised is filed under SYSTEM
 * rather than dropped, because a log that silently discards entries it does
 * not recognise is worse than one that labels them badly.
 */
export function entryCategory(entry) {
  const voice = (entry && entry.voice) || 'System';
  return VOICES.includes(voice) ? voice : 'System';
}

/** How many entries each chip should show. */
export function categoryCounts(list) {
  const counts = { ALL: (list || []).length };
  for (const voice of VOICES) counts[voice] = 0;
  for (const entry of list || []) counts[entryCategory(entry)] += 1;
  return counts;
}

function scrollToNewest() {
  if (container) container.scrollTop = 0;
}

function renderChips() {
  if (!chipsEl) return;
  const counts = categoryCounts(entries);
  const chips = ['ALL', ...VOICES];
  chipsEl.innerHTML = chips.map((voice) => {
    const on = voice === activeVoice;
    const n = counts[voice] || 0;
    return `<button class="narrative-chip${on ? ' active' : ''}" data-voice="${voice}"`
      + ` aria-pressed="${on ? 'true' : 'false'}"`
      + `${n ? '' : ' disabled'}>${voice.toUpperCase()} ${n}</button>`;
  }).join('');
  for (const btn of chipsEl.querySelectorAll('.narrative-chip')) {
    btn.addEventListener('click', () => {
      activeVoice = btn.dataset.voice;
      render();
    });
  }
}

function render() {
  if (!container) return;
  const visible = entries.filter((e) => activeVoice === 'ALL' || entryCategory(e) === activeVoice);
  container.innerHTML = visible.map((entry) => {
    const voice = entry.voice || 'System';
    const color = VOICE_COLORS[voice] || DEFAULT_VOICE_COLOR;
    const ts = entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    return `<div class="narrative-entry">`
      + `<span class="narrative-voice" style="color:${color}">[${escapeHtml(voice)}]</span> `
      + `<span class="narrative-time">${ts}</span> `
      + `<span class="narrative-text">${escapeHtml(entry.text || '')}</span>`
      + `</div>`;
  }).join('');

  if (follow) scrollToNewest();
  renderChips();
  if (pinEl) {
    pinEl.textContent = follow ? 'FOLLOWING' : 'PAUSED';
    pinEl.classList.toggle('paused', !follow);
  }
}

/**
 * Add a batch of entries to the ring and redraw.
 *
 * @param {Array<{voice?: string, text: string, timestamp?: number}>} batch
 */
export function pushEntries(batch) {
  if (!Array.isArray(batch) || !batch.length) return;
  entries = entries.concat(batch);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
  render();
}

/**
 * Create the narrative panel in #narrative-panel.
 *
 * @param {import('../core/eventBus.js').EventBus} bus
 */
export function createNarrativePanel(bus) {
  const panel = document.getElementById('narrative-panel');
  if (!panel) return null;

  panel.innerHTML = `
    <div class="narrative-header">
      <span class="narrative-title">Narrative Log</span>
      <span id="narrative-pin" class="narrative-pin">FOLLOWING</span>
      <button id="narrative-clear-btn" class="narrative-clear-btn" title="Clear log">✕</button>
    </div>
    <div id="narrative-chips" class="narrative-chips"></div>
    <div id="narrative-scroll" class="narrative-scroll"></div>
  `;

  container = document.getElementById('narrative-scroll');
  chipsEl = document.getElementById('narrative-chips');
  pinEl = document.getElementById('narrative-pin');
  entries = [];
  activeVoice = 'ALL';
  follow = true;

  document.getElementById('narrative-clear-btn')?.addEventListener('click', () => {
    entries = [];
    activeVoice = 'ALL';
    render();
  });

  // Scrolling away from the newest entry stops the panel dragging you back.
  container.addEventListener('scroll', () => {
    follow = container.scrollTop <= PIN_THRESHOLD_PX;
    if (pinEl) {
      pinEl.textContent = follow ? 'FOLLOWING' : 'PAUSED';
      pinEl.classList.toggle('paused', !follow);
    }
  });

  // The queue is the only producer of `narrative:batch`, and this panel is its
  // only consumer, so both live here rather than in main.js's wiring.
  queue = createLogQueue(bus);
  bus.on('narrative:batch', pushEntries);

  renderChips();
  return { flush: () => queue && queue.flush(), pending: () => queue && queue.pending() };
}
