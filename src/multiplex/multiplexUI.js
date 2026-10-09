// ============================================================================
// VEPA4 — Chaos Multiplex UI
// Owns the initial setup screen (modal with ALL multiplex settings), the
// full-screen shard grid overlay, the top metrics drawer (per-shard scores),
// and the bottom controls drawer (iterate / exit / grid stats).
// ============================================================================

import {
  createMultiplex,
  startMultiplex,
  stopMultiplex,
  iterateMultiplex,
  frameMultiplex,
  setMultiplexPool,
  applyMultiplexPreset,
  MULTIPLEX_PRESETS,
  renderMultiplex,
  resizeMultiplex,
  summarizeMultiplex,
  selectShard,
  getFitnessReport,
  compareShards,
  revertMultiplex,
  MULTIPLEX_DEFAULTS,
  FITNESS_METRICS,
  MAX_SHARDS,
} from './multiplex.js';
import {
  initMultiplexHelp,
  hideTooltip,
  openMultiplexHelp,
  closeMultiplexHelp,
} from './multiplexHelp.js';
import { MAX_PARTICLES, LAW_COUNT } from '../constants.js';
import { DEFAULT_LIGHT_LAWS, sanitizeLawNames } from './previewLaws.js';
import { sanitizeLawCount, LIGHT_LAW_COUNT } from './lawRanking.js';
import { SPEED_FIDELITY_LEVELS, SPEED_SLIDER_KEYS, FIDELITY_LAW_COUNT, fidelityPreset, fidelityOf } from '../state/worldParams.js';
import { runtimeConfig } from '../state/runtimeConfig.js';

/** D-038: which FIDELITY level the world speed sliders + LAW COUNT match. */
function syncMpxFidelity(modal) {
  const sel = modal.querySelector('#mpx-fidelity');
  const input = modal.querySelector('#mpx-law-count');
  if (!sel || !input) return;
  const level = fidelityOf(runtimeConfig.worldParams);
  sel.value = level !== 'CUSTOM' && sanitizeLawCount(input.value) === FIDELITY_LAW_COUNT[level] ? level : 'CUSTOM';
}

/** D-036: LAW COUNT readout ("136 · ALL", "16 · LIGHT SET", "40"). */
function showLawCount(modal) {
  const input = modal.querySelector('#mpx-law-count');
  const out = modal.querySelector('#mpx-law-count-value');
  if (!input || !out) return;
  const n = sanitizeLawCount(input.value);
  out.textContent = n >= LAW_COUNT ? `${n} · ALL` : n === LIGHT_LAW_COUNT ? `${n} · LIGHT SET` : String(n);
}
import { createShardPool, browserSpawn, defaultPoolSize } from './shardPool.js';
import { loadMultiplexSettings, saveMultiplexSettings, PARTICLES_PER_SIM_MIN, PARTICLES_PER_SIM_MAX } from './multiplexSettings.js';
import { formatMetric, numberOr } from './metricFormat.js';
import { wireSettingsTabs } from '../ui/settingsTabs.js';

const MODAL_ID = 'chaos-modal';
const OVERLAY_ID = 'multiplex-overlay';
const GRID_ID = 'multiplex-grid';
const DRAWER_ID = 'multiplex-drawer';

/**
 * Create the multiplex controller.
 *
 * @param {object} bus        - App event bus
 * @param {Function} getSource - Returns the current source sim:
 *   { view, count, dna, laws, speciesCount }
 * @returns Controller with { mx, openModal, closeModal, exit, iterate,
 *   isActive, step, render, resize }
 */
export function createMultiplexController(bus, getSource, applyShard) {
  const mx = createMultiplex(bus);
  let overlay = null;
  let grid = null;
  let drawer = null;
  let metricsDrawer = null;
  let metricsFrame = 0;
  let lastConfig = null;
  let domReady = false;

  // ── DOM scaffolding (created lazily on first use) ──

  function ensureDom() {
    if (domReady) return;
    domReady = true;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);

    // Metrics top drawer — collapsible per-shard scores + live stats.
    // Appended first: the overlay column stacks [metrics, grid, controls].
    metricsDrawer = document.createElement('div');
    metricsDrawer.id = 'mpx-metrics';
    metricsDrawer.className = 'expanded';
    metricsDrawer.innerHTML = `
      <button id="mpx-metrics-toggle" class="mpx-metrics-toggle" type="button" data-mpx-help="metrics">▼ METRICS</button>
      <div class="mpx-metrics-body">
        <div id="mpx-metrics-chips" class="mpx-metrics-chips"></div>
        <div id="mpx-metrics-stats" class="mpx-metrics-stats"></div>
        <button id="mpx-ch-toggle" class="mpx-ch-toggle" type="button">▸ COMPARE / HIST</button>
        <div id="mpx-ch-body" class="mpx-ch-body collapsed">
          <div id="mpx-compare" class="mpx-compare"></div>
          <div id="mpx-history" class="mpx-history"></div>
        </div>
      </div>`;
    overlay.appendChild(metricsDrawer);
    metricsDrawer.querySelector('#mpx-ch-toggle').addEventListener('click', () => {
      const body = metricsDrawer.querySelector('#mpx-ch-body');
      const toggle = metricsDrawer.querySelector('#mpx-ch-toggle');
      const collapsed = body.classList.toggle('collapsed');
      if (toggle) toggle.textContent = collapsed ? '▸ COMPARE / HIST' : '▾ COMPARE / HIST';
      if (!collapsed) updateHistTab();
    });
    metricsDrawer.querySelector('#mpx-metrics-toggle').addEventListener('click', () => {
      metricsDrawer.classList.toggle('collapsed');
      const btn = metricsDrawer.querySelector('#mpx-metrics-toggle');
      if (btn) btn.textContent = metricsDrawer.classList.contains('collapsed') ? '▲ METRICS' : '▼ METRICS';
    });

    // Full-screen grid overlay (middle of the column).
    grid = document.createElement('div');
    grid.id = GRID_ID;
    overlay.appendChild(grid);

    // COMPARE/HIST section styles — kept local so the metrics drawer stays
    // self-contained; mirrors the mpx palette (style.css vars).
    if (!document.getElementById('mpx-compare-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'mpx-compare-styles';
      styleEl.textContent = `
        .mpx-compare { max-height: 170px; overflow: auto; border: 1px solid var(--border); border-radius: 4px; font-size: 11px; margin-top: 6px; }
        .mpx-compare-table { border-collapse: collapse; width: 100%; }
        .mpx-compare-table th, .mpx-compare-table td { padding: 2px 5px; text-align: right; white-space: nowrap; }
        .mpx-compare-table thead th { font-family: var(--font-mono); letter-spacing: 1px; color: var(--text-secondary); cursor: pointer; user-select: none; position: sticky; top: 0; background: var(--bg-panel); touch-action: manipulation; }
        .mpx-compare-table thead th:hover, .mpx-compare-table thead th.selected { color: var(--accent-red); }
        .mpx-compare-table tbody td:first-child { text-align: left; color: var(--text-secondary); letter-spacing: 1px; }
        .mpx-compare-val { color: var(--text-primary); }
        .mpx-compare-val.best { color: var(--accent-red); font-weight: bold; background: rgba(255,74,74,0.10); }
        .mpx-history { display: flex; flex-direction: column; gap: 2px; max-height: 150px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 4px; margin-top: 6px; }
        .mpx-hist-row { display: flex; align-items: center; gap: 6px; font-size: 11px; letter-spacing: 1px; color: var(--text-secondary); padding: 2px 4px; border-radius: 3px; }
        .mpx-hist-row.current { background: rgba(255,74,74,0.14); color: var(--accent-red); }
        .mpx-hist-gen { flex: 0 0 28px; color: var(--text-primary); }
        .mpx-hist-best { flex: 1; }
        .mpx-hist-revert { background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 3px; color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; cursor: pointer; padding: 2px 6px; touch-action: manipulation; }
        .mpx-hist-revert:hover:not(:disabled) { border-color: var(--accent-red); color: var(--accent-red); }
        .mpx-hist-revert:disabled { opacity: 0.4; cursor: default; }
        .mpx-ch-toggle { background: none; border: 1px solid var(--border); border-radius: 3px; color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; cursor: pointer; padding: 2px 6px; margin-top: 6px; touch-action: manipulation; }
        .mpx-ch-toggle:hover { border-color: var(--accent-red); color: var(--accent-red); }
        .mpx-ch-body.collapsed { display: none; }
        /* Tap contract, matching the drawer: 44px floor for coarse pointers. */
        @media (pointer: coarse) {
          .mpx-hist-revert, .mpx-ch-toggle, .mpx-compare-table thead th { min-height: 44px; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Bottom controls drawer — slim bar with the iterate/exit actions and
    // grid stats. All settings now live in the initial setup screen.
    drawer = document.createElement('div');
    drawer.id = DRAWER_ID;
    drawer.className = 'minimized hidden';
    drawer.innerHTML = `
      <div class="mpx-strip" title="Expand multiplex controls" data-mpx-help="drawer">
        <button id="mpx-iterate-strip" class="mpx-btn mpx-icon" title="Iterate multiplex" data-mpx-help="iterate">⚡</button>
        <span class="mpx-chevron">▲</span>
      </div>
      <div class="mpx-body">
        <div class="mpx-body-header">
          <span class="mpx-title">MULTIPLEX</span>
          <span class="mpx-header-actions">
            <button id="mpx-settings" class="mpx-btn mpx-icon" title="Open the full multiplex controls" data-mpx-help="drawer">⚙</button>
            <button id="mpx-help" class="mpx-btn mpx-icon mpx-help-btn" type="button" title="Open the multiplex guide" data-mpx-help="help">?</button>
            <button id="mpx-minimize" class="mpx-btn mpx-icon" title="Minimize" data-mpx-help="drawer">▼</button>
          </span>
        </div>
        <div class="mpx-stat" id="mpx-stat-grid">—</div>
        <div class="mpx-stat" id="mpx-stat-selected">SELECTED —</div>
        <div class="mpx-stat" id="mpx-stat-iteration">ITERATION 0</div>
        <div class="mpx-actions">
          <button id="mpx-iterate" class="mpx-btn mpx-action" title="Regenerate all shards from the selected shard" data-mpx-help="iterate">⚡ ITERATE</button>
          <button id="mpx-exit" class="mpx-btn mpx-action mpx-danger" title="Exit multiplex (imports the selected shard)" data-mpx-help="exit">✕ EXIT</button>
        </div>
      </div>`;
    overlay.appendChild(drawer);

    drawer.querySelector('#mpx-iterate-strip').addEventListener('click', (e) => {
      e.stopPropagation();
      iterate();
    });
    drawer.querySelector('.mpx-strip').addEventListener('click', () => {
      drawer.classList.remove('minimized');
      drawer.classList.add('expanded');
      updateDrawer();
    });
    drawer.querySelector('#mpx-minimize').addEventListener('click', () => {
      drawer.classList.remove('expanded');
      drawer.classList.add('minimized');
    });
    drawer.querySelector('#mpx-iterate').addEventListener('click', iterate);
    drawer.querySelector('#mpx-exit').addEventListener('click', exit);
    drawer.querySelector('#mpx-help').addEventListener('click', openMultiplexHelp);
    // Reopen the full setup screen mid-run — every multiplex control lives there.
    drawer.querySelector('#mpx-settings').addEventListener('click', openModal);

    // Initial setup screen (long-press the Chaos button) — every multiplex
    // setting lives here so the run is fully configured up front.
    buildModal();

    // Long-press tooltips on every [data-mpx-help] control + the ? guide.
    initMultiplexHelp(document.body);
  }

  // ── Initial setup screen ──

  function buildModal() {
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="chaos-modal-panel">
        <div class="chaos-modal-title-row">
          <div class="chaos-modal-title">CHAOS MULTIPLEX</div>
          <button id="mpx-fullscreen" class="mpx-btn mpx-icon mpx-fullscreen-btn" type="button" title="Open full-screen">⛶</button>
        </div>
        <p class="chaos-modal-sub">Guided evolution — X×Y concurrent futures, one shared camera.</p>

        <div class="settings-tabs" role="tablist" aria-label="Multiplex settings">
          <button class="settings-tab active" role="tab" type="button" id="mpx-tab-grid" data-tab="grid" aria-selected="true" aria-controls="mpx-panel-grid">GRID &amp; PERF</button>
          <button class="settings-tab" role="tab" type="button" id="mpx-tab-breed" data-tab="breed" aria-selected="false" aria-controls="mpx-panel-breed">BREEDING</button>
          <button class="settings-tab" role="tab" type="button" id="mpx-tab-iterate" data-tab="iterate" aria-selected="false" aria-controls="mpx-panel-iterate">ITERATE &amp; SELECT</button>
          <button class="settings-tab" role="tab" type="button" id="mpx-tab-fitness" data-tab="fitness" aria-selected="false" aria-controls="mpx-panel-fitness">FITNESS</button>
          <button class="settings-tab" role="tab" type="button" id="mpx-tab-display" data-tab="display" aria-selected="false" aria-controls="mpx-panel-display">DISPLAY &amp; RUN</button>
        </div>

        <div class="settings-tabpanel" role="tabpanel" id="mpx-panel-grid" data-tab="grid" aria-labelledby="mpx-tab-grid">
          <p class="settings-tab-intro">How many sims run side by side, how many particles each gets, and how hard the machine works. Long-press any label for details.</p>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="grid">GRID</div>
            <div class="chaos-grid-row" data-mpx-help="grid">
              <label>Columns <input id="mpx-cols" type="number" min="1" max="5" value="2"></label>
              <label>Rows <input id="mpx-rows" type="number" min="1" max="5" value="2"></label>
              <span class="chaos-grid-count" id="mpx-shard-count">4 SIMS</span>
            </div>
          </div>

          <div class="chaos-modal-section" id="mpx-perf-section">
            <div class="chaos-modal-label" data-mpx-help="perfPreset">PERFORMANCE</div>
            <div class="mpx-set-row" data-mpx-help="perfPreset">
              <span class="mpx-set-label">PRESET</span>
              <select id="mpx-preset">
                <option value="custom">Custom</option>
                ${Object.entries(MULTIPLEX_PRESETS).map(([id, p]) => `<option value="${id}">${p.label}</option>`).join('')}
              </select>
              <span class="mpx-set-value" id="mpx-preset-note"></span>
            </div>
            <div class="mpx-set-row" data-mpx-help="lawTier">
              <span class="mpx-set-label">PREVIEW LAWS</span>
              <select id="mpx-law-tier"><option value="full">Full</option><option value="light">Light</option></select>
              <button id="mpx-light-reset" class="mpx-btn" type="button" title="Restore the default light set">RESET</button>
            </div>
            <div class="mpx-set-row" data-mpx-help="fidelity">
              <span class="mpx-set-label">FIDELITY</span>
              <select id="mpx-fidelity"><option value="CUSTOM">Custom</option>${SPEED_FIDELITY_LEVELS.map((lv) => `<option value="${lv}">${lv[0]}${lv.slice(1).toLowerCase()}</option>`).join('')}</select>
              <span class="mpx-set-value">MEDIUM / LOW change results</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="lawCount">
              <span class="mpx-set-label">LAW COUNT</span>
              <input id="mpx-law-count" type="range" min="1" max="${LAW_COUNT}" step="1" value="${LAW_COUNT}">
              <span class="mpx-set-value" id="mpx-law-count-value">${LAW_COUNT} · ALL</span>
            </div>
            <span class="settings-hint">Speed slider for Full laws (Full fidelity). ${LAW_COUNT} = every law (default). Fewer = only the top-ranked laws act in the previews: CHANGES RESULTS. 16 = the light set.</span>
            <div class="mpx-set-row settings-row-stack" data-mpx-help="lightLaws">
              <span class="settings-hint">Light law set (used only when PREVIEW LAWS is Light)</span>
              <textarea id="mpx-light-laws" rows="2" spellcheck="false" style="width:100%;font:inherit;font-size:10px" aria-label="Light law set"></textarea>
            </div>
            <div class="mpx-set-row" data-mpx-help="tickMode">
              <span class="mpx-set-label">SIM TICKS</span>
              <select id="mpx-tick-mode">
                <option value="frame">Every frame</option>
                <option value="fixed">Fixed rate</option>
                <option value="adaptive">Adaptive (keep 60 fps)</option>
              </select>
            </div>
            <div class="mpx-set-row" data-mpx-help="ticksPerSecond">
              <span class="mpx-set-label">TICKS / SEC</span>
              <input id="mpx-tps" type="number" min="0.5" max="240" step="1" value="30">
              <span class="mpx-set-value">per sim · Fixed rate only</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="frameBudget">
              <span class="mpx-set-label">FRAME BUDGET (MS)</span>
              <input id="mpx-budget" type="number" min="1" max="14" step="0.5" value="8">
              <span class="mpx-set-value">in-thread only (pool off)</span>
            </div>
            <label class="chaos-check" data-mpx-help="useWorkers"><input id="mpx-workers" type="checkbox" checked><span>Worker pool (sims off the UI thread)</span></label>
          </div>

          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="popScale">POPULATION</div>
            <div class="mpx-set-row" data-mpx-help="particlesPerSim">
              <span class="mpx-set-label">PARTICLES / SIM</span>
              <input id="mpx-per-sim" type="number" min="0" max="${PARTICLES_PER_SIM_MAX}" step="25" value="0">
              <span class="mpx-set-value">0 = use POP %</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="popPercent">
              <span class="mpx-set-label">POP % / SIM</span>
              <input id="mpx-pop-percent" type="number" min="0" max="100" step="0.5" value="0">
              <span class="mpx-set-value">0 = auto split</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="popScale">
              <span class="mpx-set-label">POP SCALE</span>
              <input id="mpx-pop-scale" type="range" min="0.25" max="1" step="0.05" value="1">
              <span class="mpx-set-value" id="mpx-pop-scale-value">100%</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="substeps">
              <span class="mpx-set-label">SUBSTEPS</span>
              <input id="mpx-substeps" type="range" min="1" max="8" step="1" value="1">
              <span class="mpx-set-value" id="mpx-substeps-value">1</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="seed">
              <span class="mpx-set-label">SEED</span>
              <input id="mpx-seed" type="number" min="0" max="2147483647" step="1" value="0">
              <span class="mpx-set-value" id="mpx-seed-value">RANDOM</span>
            </div>
          </div>
        </div>

        <div class="settings-tabpanel" role="tabpanel" id="mpx-panel-breed" data-tab="breed" aria-labelledby="mpx-tab-breed" hidden>
          <p class="settings-tab-intro">How each new generation is made from the selected sim, and how different the sims are from each other.</p>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="derive">DERIVED FROM THE SELECTED SIMULATION</div>
            <label class="chaos-radio" data-mpx-help="derive"><input type="radio" name="mpx-derive" value="clone" checked><span>Clone — copy the current particles, DNA &amp; laws, then vary</span></label>
            <label class="chaos-radio" data-mpx-help="derive"><input type="radio" name="mpx-derive" value="spawn"><span>Spawn — fresh full population, keep DNA &amp; laws</span></label>
            <div class="mpx-set-row" data-mpx-help="spawnSpecies">
              <span class="mpx-set-label">SPAWN SPECIES</span>
              <input id="mpx-spawn-species" type="range" min="1" max="5" step="1" value="5">
              <span class="mpx-set-value" id="mpx-spawn-species-value">5</span>
            </div>
            <span class="settings-hint">Spawn species is used only by Spawn.</span>
            <div class="mpx-set-row" data-mpx-help="refillToCap">
              <label class="mpx-check"><input id="mpx-refill" type="checkbox" checked><span>REFILL TO CAP</span></label>
            </div>
            <span class="settings-hint">Clone only: on each iterate, top every new sim back up to full population by copying survivors (or respawning from the selected sim's DNA if none survived). Off = survivors only, so a shrinking world keeps shrinking.</span>
          </div>

          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="randomize">ASPECTS TO VARY</div>
            <label class="chaos-check" data-mpx-help="randomize"><input id="mpx-rand-laws" type="checkbox" checked><span>Laws</span></label>
            <label class="chaos-check" data-mpx-help="randomize"><input id="mpx-rand-dna" type="checkbox" checked><span>DNA</span></label>
            <label class="chaos-check" data-mpx-help="randomize"><input id="mpx-rand-pop" type="checkbox" checked><span>Population</span></label>
            <label class="chaos-check" data-mpx-help="randomize"><input id="mpx-rand-params" type="checkbox" checked><span>World params</span></label>
          </div>

          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="variation">VARIATION BETWEEN SIMS</div>
            <input id="mpx-variation" type="range" min="0" max="1" step="0.05" value="0.5" data-mpx-help="variation" aria-label="Variation between sims">
            <div class="chaos-variation-row">
              <span>IDENTICAL</span><span id="mpx-variation-value">50%</span><span>WILD</span>
            </div>
            <span class="settings-hint">Per-aspect strength (scales the master knob above):</span>
            <div class="mpx-set-row" data-mpx-help="lawVar">
              <span class="mpx-set-label">LAWS</span>
              <input id="mpx-law-var" type="range" min="0" max="1" step="0.05" value="1">
              <span class="mpx-set-value" id="mpx-law-var-value">100%</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="dnaVar">
              <span class="mpx-set-label">DNA</span>
              <input id="mpx-dna-var" type="range" min="0" max="1" step="0.05" value="1">
              <span class="mpx-set-value" id="mpx-dna-var-value">100%</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="popVar">
              <span class="mpx-set-label">POPULATION</span>
              <input id="mpx-pop-var" type="range" min="0" max="1" step="0.05" value="1">
              <span class="mpx-set-value" id="mpx-pop-var-value">100%</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="paramVar">
              <span class="mpx-set-label">WORLD PARAMS</span>
              <input id="mpx-param-var" type="range" min="0" max="1" step="0.05" value="1">
              <span class="mpx-set-value" id="mpx-param-var-value">100%</span>
            </div>
          </div>

          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="drift">VARIATION OVER GENERATIONS</div>
            <div class="mpx-set-row" data-mpx-help="drift">
              <span class="mpx-set-label">DRIFT (+/GEN)</span>
              <input id="mpx-drift" type="range" min="0" max="0.05" step="0.005" value="0">
              <span class="mpx-set-value" id="mpx-drift-value">0</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="cooling">
              <span class="mpx-set-label">COOLING (−%/GEN)</span>
              <input id="mpx-cooling" type="range" min="0" max="0.2" step="0.01" value="0">
              <span class="mpx-set-value" id="mpx-cooling-value">0%</span>
            </div>
          </div>
        </div>

        <div class="settings-tabpanel" role="tabpanel" id="mpx-panel-iterate" data-tab="iterate" aria-labelledby="mpx-tab-iterate" hidden>
          <p class="settings-tab-intro">When generations are rebuilt (⚡ or automatically) and which sim is kept or selected afterwards.</p>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="autoIterate">AUTO-ITERATE</div>
            <div class="mpx-set-row" data-mpx-help="autoIterate">
              <label class="mpx-check"><input id="mpx-auto-iterate" type="checkbox"><span>AUTO-ITERATE</span></label>
              <span class="mpx-set-value" id="mpx-auto-value">OFF</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="interval">
              <span class="mpx-set-label">ITERATE EVERY</span>
              <input id="mpx-interval" type="range" min="50" max="2000" step="50" value="400">
              <span class="mpx-set-value" id="mpx-interval-value">400T</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="adaptInt">
              <label class="mpx-check"><input id="mpx-adapt" type="checkbox"><span>ADAPTIVE INTERVAL</span></label>
            </div>
            <div class="mpx-set-row" data-mpx-help="maxIters">
              <span class="mpx-set-label">MAX ITERATIONS</span>
              <input id="mpx-max-iters" type="number" min="0" max="999" value="0">
              <span class="mpx-set-value" id="mpx-max-iters-value">∞</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="stagLimit">
              <span class="mpx-set-label">STAGNATION LIMIT</span>
              <input id="mpx-stag-limit" type="range" min="0" max="20" step="1" value="5">
              <span class="mpx-set-value" id="mpx-stag-limit-value">5</span>
            </div>
          </div>

          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="selectAfter">SELECTION</div>
            <div class="mpx-set-row" data-mpx-help="selectAfter">
              <span class="mpx-set-label">SELECT AFTER ITERATE</span>
              <select id="mpx-select-after">
                <option value="none">NONE (keep current)</option>
                <option value="fittest">FITTEST</option>
                <option value="follow">FOLLOW (most similar)</option>
              </select>
            </div>
            <div class="mpx-set-row" data-mpx-help="keepSelected">
              <label class="mpx-check"><input id="mpx-keep-selected" type="checkbox"><span>KEEP SELECTED SIM UNCHANGED</span></label>
            </div>
            <div class="mpx-set-row" data-mpx-help="elites">
              <span class="mpx-set-label">ELITES KEPT</span>
              <input id="mpx-elites" type="number" min="0" max="4" step="1" value="0">
              <span class="mpx-set-value" id="mpx-elites-value">0</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="histDepth">
              <span class="mpx-set-label">HISTORY DEPTH</span>
              <input id="mpx-hist-depth" type="number" min="1" max="12" step="1" value="6">
              <span class="mpx-set-value" id="mpx-hist-depth-value">6</span>
            </div>
          </div>
        </div>

        <div class="settings-tabpanel" role="tabpanel" id="mpx-panel-fitness" data-tab="fitness" aria-labelledby="mpx-tab-fitness" hidden>
          <p class="settings-tab-intro">What "fittest" means: weight each metric (0–100%) and choose whether high (MAX) or low (MIN) is good. All weights at 0 ranks by population.</p>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="fitnessWeights">FITNESS WEIGHTS</div>
            <div id="mpx-fit-metrics" class="mpx-modal-fit" data-mpx-help="fitnessWeights"></div>
          </div>
        </div>

        <div class="settings-tabpanel" role="tabpanel" id="mpx-panel-display" data-tab="display" aria-labelledby="mpx-tab-display" hidden>
          <p class="settings-tab-intro">Playback and rendering of the grid, and what happens when you leave.</p>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="simSpeed">RUNTIME</div>
            <div class="mpx-set-row" data-mpx-help="simSpeed">
              <span class="mpx-set-label">SIM SPEED</span>
              <input id="mpx-sim-speed" type="range" min="0.25" max="3" step="0.25" value="1">
              <span class="mpx-set-value" id="mpx-sim-speed-value">1.00×</span>
            </div>
            <div class="mpx-set-row" data-mpx-help="paused">
              <label class="mpx-check"><input id="mpx-paused" type="checkbox"><span>START PAUSED (PAUSE GRID)</span></label>
            </div>
          </div>
          <div class="chaos-modal-section">
            <div class="chaos-modal-label" data-mpx-help="eco">DISPLAY &amp; EXIT</div>
            <div class="mpx-set-row" data-mpx-help="eco">
              <label class="mpx-check"><input id="mpx-eco" type="checkbox" checked><span>ECO PREVIEWS (flat glow, faster)</span></label>
            </div>
            <div class="mpx-set-row" data-mpx-help="importOnExit">
              <label class="mpx-check"><input id="mpx-import-on-exit" type="checkbox" checked><span>IMPORT SELECTED SIM ON EXIT</span></label>
            </div>
          </div>
        </div>

        <div class="chaos-modal-actions">
          <button id="mpx-start" class="mpx-btn mpx-action">⚡ START MULTIPLEX</button>
          <button id="mpx-cancel" class="mpx-btn mpx-action mpx-danger">CANCEL</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    // D-028: tabbed setup screen (presentation only — every control keeps its
    // id, default and wiring; tabs just show one group at a time).
    wireSettingsTabs(modal.querySelector('.chaos-modal-panel'));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    // ⛶ FULL — expand the controls to the whole viewport (v8.1).
    const fullBtn = modal.querySelector('#mpx-fullscreen');
    fullBtn.addEventListener('click', () => {
      const isFull = modal.classList.toggle('fullscreen');
      fullBtn.textContent = isFull ? '🗗' : '⛶';
      fullBtn.title = isFull ? 'Exit full-screen' : 'Open full-screen';
    });
    modal.querySelector('#mpx-cancel').addEventListener('click', closeModal);
    modal.querySelector('#mpx-start').addEventListener('click', () => {
      begin(modal._readConfig());
      closeModal();
    });

    // Live value displays.
    const cols = modal.querySelector('#mpx-cols');
    const rows = modal.querySelector('#mpx-rows');
    const count = modal.querySelector('#mpx-shard-count');
    const refreshCount = () => {
      const c = Math.max(1, Math.min(5, parseInt(cols.value, 10) || 1));
      const r = Math.max(1, Math.min(5, parseInt(rows.value, 10) || 1));
      count.textContent = Math.min(MAX_SHARDS, c * r) + ' SIMS';
    };
    cols.addEventListener('input', refreshCount);
    rows.addEventListener('input', refreshCount);

    const wirePct = (id, valueId) => {
      const el = modal.querySelector(id);
      const out = modal.querySelector(valueId);
      el.addEventListener('input', () => {
        out.textContent = Math.round(parseFloat(el.value) * 100) + '%';
      });
    };
    wirePct('#mpx-variation', '#mpx-variation-value');
    wirePct('#mpx-law-var', '#mpx-law-var-value');
    wirePct('#mpx-dna-var', '#mpx-dna-var-value');
    wirePct('#mpx-pop-var', '#mpx-pop-var-value');
    wirePct('#mpx-param-var', '#mpx-param-var-value');
    wirePct('#mpx-pop-scale', '#mpx-pop-scale-value');

    const seed = modal.querySelector('#mpx-seed');
    const seedValue = modal.querySelector('#mpx-seed-value');
    seed.addEventListener('input', () => {
      seedValue.textContent = parseInt(seed.value, 10) > 0 ? String(parseInt(seed.value, 10)) : 'RANDOM';
    });

    const substeps = modal.querySelector('#mpx-substeps');
    const substepsValue = modal.querySelector('#mpx-substeps-value');
    substeps.addEventListener('input', () => {
      substepsValue.textContent = String(parseInt(substeps.value, 10) || 1);
    });

    const spawnSpecies = modal.querySelector('#mpx-spawn-species');
    const spawnSpeciesValue = modal.querySelector('#mpx-spawn-species-value');
    spawnSpecies.addEventListener('input', () => {
      spawnSpeciesValue.textContent = String(Math.max(1, Math.min(5, parseInt(spawnSpecies.value, 10) || 1)));
    });

    const autoIterate = modal.querySelector('#mpx-auto-iterate');
    const autoValue = modal.querySelector('#mpx-auto-value');
    autoIterate.addEventListener('change', (e) => {
      autoValue.textContent = e.target.checked ? 'ON' : 'OFF';
    });

    const interval = modal.querySelector('#mpx-interval');
    const intervalValue = modal.querySelector('#mpx-interval-value');
    interval.addEventListener('input', () => {
      intervalValue.textContent = (parseInt(interval.value, 10) || 400) + 'T';
    });

    const maxIters = modal.querySelector('#mpx-max-iters');
    const maxItersValue = modal.querySelector('#mpx-max-iters-value');
    maxIters.addEventListener('input', () => {
      maxItersValue.textContent = parseInt(maxIters.value, 10) > 0 ? String(parseInt(maxIters.value, 10)) : '∞';
    });

    const drift = modal.querySelector('#mpx-drift');
    const driftValue = modal.querySelector('#mpx-drift-value');
    drift.addEventListener('input', () => {
      driftValue.textContent = String(parseFloat(drift.value) || 0);
    });

    const stagLimit = modal.querySelector('#mpx-stag-limit');
    const stagLimitValue = modal.querySelector('#mpx-stag-limit-value');
    stagLimit.addEventListener('input', () => {
      const v = parseInt(stagLimit.value, 10) || 0;
      stagLimitValue.textContent = v > 0 ? String(v) : 'OFF';
    });

    const elites = modal.querySelector('#mpx-elites');
    const elitesValue = modal.querySelector('#mpx-elites-value');
    elites.addEventListener('input', () => {
      const v = Math.max(0, Math.min(4, parseInt(elites.value, 10) || 0));
      elites.value = v;
      elitesValue.textContent = String(v);
    });

    const cooling = modal.querySelector('#mpx-cooling');
    const coolingValue = modal.querySelector('#mpx-cooling-value');
    cooling.addEventListener('input', () => {
      coolingValue.textContent = Math.round((parseFloat(cooling.value) || 0) * 100) + '%';
    });

    const histDepth = modal.querySelector('#mpx-hist-depth');
    const histDepthValue = modal.querySelector('#mpx-hist-depth-value');
    histDepth.addEventListener('input', () => {
      const v = Math.max(1, Math.min(12, parseInt(histDepth.value, 10) || 6));
      histDepth.value = v;
      histDepthValue.textContent = String(v);
    });

    const simSpeed = modal.querySelector('#mpx-sim-speed');
    const simSpeedValue = modal.querySelector('#mpx-sim-speed-value');
    simSpeed.addEventListener('input', () => {
      simSpeedValue.textContent = (parseFloat(simSpeed.value) || 1).toFixed(2) + '×';
    });

    // Fitness weights: 14 sliders + MAX/MIN mode toggles, read at start.
    const fit = { weights: { ...MULTIPLEX_DEFAULTS.fitnessWeights }, modes: { ...MULTIPLEX_DEFAULTS.fitnessModes } };
    const host = modal.querySelector('#mpx-fit-metrics');
    host.innerHTML = FITNESS_METRICS.map((key) => `
      <div class="mpx-fit-row" data-metric="${key}" data-mpx-help="metric-${key}">
        <span class="mpx-fit-label" title="${key}">${key.toUpperCase()}</span>
        <input type="range" min="0" max="1" step="0.05" data-metric="${key}">
        <span class="mpx-fit-pct" data-metric="${key}">0%</span>
        <button class="mpx-mode" data-metric="${key}" type="button" title="fitness mode">MAX</button>
      </div>`).join('');
    const syncFit = () => {
      for (const key of FITNESS_METRICS) {
        const w = Math.max(0, Math.min(1, parseFloat(fit.weights[key]) || 0));
        const mode = fit.modes[key] === 'min' ? 'MIN' : 'MAX';
        const slider = host.querySelector(`input[data-metric="${key}"]`);
        const pct = host.querySelector(`.mpx-fit-pct[data-metric="${key}"]`);
        const btn = host.querySelector(`.mpx-mode[data-metric="${key}"]`);
        if (slider) slider.value = w;
        if (pct) pct.textContent = Math.round(w * 100) + '%';
        if (btn) btn.textContent = mode;
      }
    };
    host.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.addEventListener('input', () => {
        fit.weights[slider.dataset.metric] = parseFloat(slider.value) || 0;
        const pct = host.querySelector(`.mpx-fit-pct[data-metric="${slider.dataset.metric}"]`);
        if (pct) pct.textContent = Math.round((parseFloat(slider.value) || 0) * 100) + '%';
      });
    });
    host.querySelectorAll('.mpx-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.metric;
        fit.modes[key] = fit.modes[key] === 'min' ? 'max' : 'min';
        btn.textContent = fit.modes[key] === 'min' ? 'MIN' : 'MAX';
      });
    });

    // MX-20 performance controls: presets, particles/sim ↔ POP %, light laws.
    {
      const q = (id) => modal.querySelector(id);
      const preset = q('#mpx-preset');
      const note = q('#mpx-preset-note');
      const perSim = q('#mpx-per-sim');
      const pct = q('#mpx-pop-percent');
      const markCustom = () => { preset.value = 'custom'; note.textContent = ''; };
      preset.addEventListener('change', () => {
        if (preset.value === 'custom') { note.textContent = ''; return; }
        const id = preset.value;
        populateModal(applyMultiplexPreset(modal._readConfig(), id));
        preset.value = id;
      });
      perSim.addEventListener('input', () => {
        const n = parseInt(perSim.value, 10) || 0;
        if (pct) pct.value = n > 0 ? String(Math.round((n / MAX_PARTICLES) * 100 * 1000) / 1000) : '0';
        markCustom();
      });
      if (pct) pct.addEventListener('input', () => {
        const p = parseFloat(pct.value) || 0;
        perSim.value = p > 0 ? String(Math.round((MAX_PARTICLES * Math.min(100, p)) / 100)) : '0';
        markCustom();
      });
      for (const id of ['#mpx-law-tier', '#mpx-light-laws', '#mpx-tick-mode', '#mpx-tps', '#mpx-budget', '#mpx-workers', '#mpx-cols', '#mpx-rows']) {
        q(id).addEventListener('input', markCustom);
        q(id).addEventListener('change', markCustom);
      }
      // D-036 LAW COUNT: a speed slider, not a preset knob (stays on the preset).
      q('#mpx-law-count').addEventListener('input', () => { showLawCount(modal); syncMpxFidelity(modal); });
      // D-038 FIDELITY: sets the world speed sliders (shared with SETUP ›
      // WORLD › PERFORMANCE › SPEED) and LAW COUNT (LOW = the 16-law light set).
      q('#mpx-fidelity').addEventListener('change', () => {
        const level = q('#mpx-fidelity').value;
        if (!SPEED_FIDELITY_LEVELS.includes(level)) return;
        const preset = fidelityPreset(level);
        if (bus) {
          for (const key of SPEED_SLIDER_KEYS) bus.emit('world:paramChanged', { key, value: preset[key] });
          bus.emit('world:paramsRestored');
        }
        q('#mpx-law-count').value = String(FIDELITY_LAW_COUNT[level]);
        showLawCount(modal);
        syncMpxFidelity(modal);
      });
      q('#mpx-light-reset').addEventListener('click', () => { q('#mpx-light-laws').value = DEFAULT_LIGHT_LAWS.join(' '); markCustom(); });
    }

    modal._readConfig = () => {
      const c = Math.max(1, Math.min(5, parseInt(cols.value, 10) || 1));
      const r = Math.max(1, Math.min(5, parseInt(rows.value, 10) || 1));
      return {
        cols: c,
        rows: r,
        randomizeLaws: modal.querySelector('#mpx-rand-laws').checked,
        randomizeDNA: modal.querySelector('#mpx-rand-dna').checked,
        randomizePopulation: modal.querySelector('#mpx-rand-pop').checked,
        randomizeParams: modal.querySelector('#mpx-rand-params').checked,
        variation: parseFloat(modal.querySelector('#mpx-variation').value) || 0,
        lawVariation: numberOr(modal.querySelector('#mpx-law-var').value, 1),
        dnaVariation: numberOr(modal.querySelector('#mpx-dna-var').value, 1),
        popVariation: numberOr(modal.querySelector('#mpx-pop-var').value, 1),
        paramVariation: numberOr(modal.querySelector('#mpx-param-var').value, 1),
        deriveMode: (modal.querySelector('input[name="mpx-derive"]:checked') || {}).value || 'clone',
        refillToCap: modal.querySelector('#mpx-refill').checked,
        populationScale: parseFloat(modal.querySelector('#mpx-pop-scale').value) || 1,
        populationPercent: Math.max(0, Math.min(100, parseFloat((modal.querySelector('#mpx-pop-percent') || {}).value) || 0)),
        seed: Math.max(0, parseInt(modal.querySelector('#mpx-seed').value, 10) || 0),
        substeps: Math.max(1, Math.min(8, parseInt(modal.querySelector('#mpx-substeps').value, 10) || 1)),
        spawnSpecies: Math.max(1, Math.min(5, parseInt(modal.querySelector('#mpx-spawn-species').value, 10) || 1)),
        autoIterate: modal.querySelector('#mpx-auto-iterate').checked,
        autoIterateInterval: Math.max(1, parseInt(modal.querySelector('#mpx-interval').value, 10) || 400),
        selectAfterIterate: modal.querySelector('#mpx-select-after').value,
        keepSelected: modal.querySelector('#mpx-keep-selected').checked,
        simSpeed: parseFloat(modal.querySelector('#mpx-sim-speed').value) || 1,
        paused: modal.querySelector('#mpx-paused').checked,
        maxIterations: Math.max(0, parseInt(modal.querySelector('#mpx-max-iters').value, 10) || 0),
        variationDrift: parseFloat(modal.querySelector('#mpx-drift').value) || 0,
        stagnationLimit: Math.max(0, parseInt(modal.querySelector('#mpx-stag-limit').value, 10) || 0),
        eliteCount: Math.max(0, Math.min(4, parseInt(modal.querySelector('#mpx-elites').value, 10) || 0)),
        cooling: Math.max(0, Math.min(0.2, parseFloat(modal.querySelector('#mpx-cooling').value) || 0)),
        adaptiveInterval: modal.querySelector('#mpx-adapt').checked,
        historyDepth: Math.max(1, Math.min(12, parseInt(modal.querySelector('#mpx-hist-depth').value, 10) || 6)),
        renderQuality: modal.querySelector('#mpx-eco').checked ? 'eco' : 'full',
        importOnExit: modal.querySelector('#mpx-import-on-exit').checked,
        fitnessWeights: { ...fit.weights },
        fitnessModes: { ...fit.modes },
        ...readPerf(),
      };
    };
    const readPerf = () => {
      const q = (id) => modal.querySelector(id);
      const perSimRaw = parseInt(q('#mpx-per-sim').value, 10) || 0;
      const light = sanitizeLawNames(q('#mpx-light-laws').value);
      const isDefaultLight = light.join(' ') === DEFAULT_LIGHT_LAWS.join(' ');
      return {
        preset: q('#mpx-preset').value || 'custom',
        particlesPerSim: perSimRaw > 0 ? Math.max(PARTICLES_PER_SIM_MIN, Math.min(PARTICLES_PER_SIM_MAX, perSimRaw)) : 0,
        lawTier: q('#mpx-law-tier').value === 'light' ? 'light' : 'full',
        lightLaws: light.length && !isDefaultLight ? light : null,
        tickMode: q('#mpx-tick-mode').value,
        ticksPerSecond: Math.max(0.5, Math.min(240, parseFloat(q('#mpx-tps').value) || 30)),
        frameBudgetMs: Math.max(1, Math.min(14, parseFloat(q('#mpx-budget').value) || 8)),
        useWorkers: q('#mpx-workers').checked,
        lawCount: sanitizeLawCount(q('#mpx-law-count').value),
      };
    };
    modal._fit = fit;
    modal._syncFit = syncFit;
  }

  function populateModal(config) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const c = config || MULTIPLEX_DEFAULTS;
    const setVal = (id, v) => {
      const el = modal.querySelector(id);
      if (el) el.value = v;
    };
    setVal('#mpx-cols', c.cols || 2);
    setVal('#mpx-rows', c.rows || 2);
    const count = modal.querySelector('#mpx-shard-count');
    if (count) count.textContent = Math.min(MAX_SHARDS, (c.cols || 2) * (c.rows || 2)) + ' SIMS';
    const check = (id, v) => {
      const el = modal.querySelector(id);
      if (el) el.checked = !!v;
    };
    check('#mpx-rand-laws', c.randomizeLaws !== false);
    check('#mpx-rand-dna', c.randomizeDNA !== false);
    check('#mpx-rand-pop', c.randomizePopulation !== false);
    check('#mpx-rand-params', c.randomizeParams !== false);
    setVal('#mpx-variation', c.variation || 0);
    const vv = modal.querySelector('#mpx-variation-value');
    if (vv) vv.textContent = Math.round((c.variation || 0) * 100) + '%';
    const setPct = (id, valueId, v) => {
      setVal(id, v);
      const out = modal.querySelector(valueId);
      if (out) out.textContent = Math.round(v * 100) + '%';
    };
    setPct('#mpx-law-var', '#mpx-law-var-value', c.lawVariation ?? 1);
    setPct('#mpx-dna-var', '#mpx-dna-var-value', c.dnaVariation ?? 1);
    setPct('#mpx-pop-var', '#mpx-pop-var-value', c.popVariation ?? 1);
    setPct('#mpx-param-var', '#mpx-param-var-value', c.paramVariation ?? 1);
    const derive = modal.querySelector(`input[name="mpx-derive"][value="${c.deriveMode || 'clone'}"]`);
    if (derive) derive.checked = true;
    check('#mpx-refill', c.refillToCap !== false);
    setVal('#mpx-law-count', sanitizeLawCount(c.lawCount));
    showLawCount(modal);
    syncMpxFidelity(modal);
    setPct('#mpx-pop-scale', '#mpx-pop-scale-value', c.populationScale ?? 1);
    { const pp = modal.querySelector('#mpx-pop-percent'); if (pp) pp.value = String(c.populationPercent ?? 0); }
    setVal('#mpx-seed', c.seed || 0);
    const sv = modal.querySelector('#mpx-seed-value');
    if (sv) sv.textContent = c.seed > 0 ? String(c.seed) : 'RANDOM';
    setVal('#mpx-substeps', c.substeps ?? 1);
    const subv = modal.querySelector('#mpx-substeps-value');
    if (subv) subv.textContent = String(c.substeps ?? 1);
    setVal('#mpx-spawn-species', c.spawnSpecies ?? 5);
    const spv = modal.querySelector('#mpx-spawn-species-value');
    if (spv) spv.textContent = String(c.spawnSpecies ?? 5);
    check('#mpx-auto-iterate', c.autoIterate === true);
    const av = modal.querySelector('#mpx-auto-value');
    if (av) av.textContent = c.autoIterate === true ? 'ON' : 'OFF';
    setVal('#mpx-interval', c.autoIterateInterval ?? 400);
    const iv = modal.querySelector('#mpx-interval-value');
    if (iv) iv.textContent = (c.autoIterateInterval ?? 400) + 'T';
    setVal('#mpx-select-after', c.selectAfterIterate || (c.autoSelectFittest ? 'fittest' : 'none'));
    check('#mpx-keep-selected', c.keepSelected === true);
    setVal('#mpx-max-iters', c.maxIterations ?? 0);
    const miv = modal.querySelector('#mpx-max-iters-value');
    if (miv) miv.textContent = (c.maxIterations ?? 0) > 0 ? String(c.maxIterations) : '∞';
    setVal('#mpx-drift', c.variationDrift ?? 0);
    const drv = modal.querySelector('#mpx-drift-value');
    if (drv) drv.textContent = String(c.variationDrift ?? 0);
    setVal('#mpx-stag-limit', c.stagnationLimit ?? 5);
    const slv = modal.querySelector('#mpx-stag-limit-value');
    if (slv) slv.textContent = (c.stagnationLimit ?? 5) > 0 ? String(c.stagnationLimit ?? 5) : 'OFF';
    setVal('#mpx-elites', c.eliteCount ?? 0);
    const elv = modal.querySelector('#mpx-elites-value');
    if (elv) elv.textContent = String(c.eliteCount ?? 0);
    setVal('#mpx-cooling', c.cooling ?? 0);
    const cov = modal.querySelector('#mpx-cooling-value');
    if (cov) cov.textContent = Math.round((c.cooling ?? 0) * 100) + '%';
    check('#mpx-adapt', c.adaptiveInterval === true);
    setVal('#mpx-hist-depth', c.historyDepth ?? 6);
    const hdv = modal.querySelector('#mpx-hist-depth-value');
    if (hdv) hdv.textContent = String(c.historyDepth ?? 6);
    setVal('#mpx-sim-speed', c.simSpeed ?? 1);
    const ssv = modal.querySelector('#mpx-sim-speed-value');
    if (ssv) ssv.textContent = ((c.simSpeed ?? 1)).toFixed(2) + '×';
    check('#mpx-paused', c.paused === true);
    check('#mpx-eco', c.renderQuality !== 'full');
    check('#mpx-import-on-exit', c.importOnExit !== false);
    setVal('#mpx-preset', c.preset && MULTIPLEX_PRESETS[c.preset] ? c.preset : 'custom');
    { const n = modal.querySelector('#mpx-preset-note'); if (n) n.textContent = (MULTIPLEX_PRESETS[c.preset] || {}).note || ''; }
    setVal('#mpx-per-sim', c.particlesPerSim ?? 0);
    if ((c.particlesPerSim ?? 0) > 0) setVal('#mpx-pop-percent', String(Math.round((c.particlesPerSim / MAX_PARTICLES) * 100 * 1000) / 1000));
    setVal('#mpx-law-tier', c.lawTier === 'light' ? 'light' : 'full');
    setVal('#mpx-light-laws', (c.lightLaws && c.lightLaws.length ? c.lightLaws : DEFAULT_LIGHT_LAWS).join(' '));
    setVal('#mpx-tick-mode', c.tickMode || 'frame');
    setVal('#mpx-tps', c.ticksPerSecond ?? 30);
    setVal('#mpx-budget', c.frameBudgetMs ?? 8);
    check('#mpx-workers', c.useWorkers !== false);
    if (modal._fit) {
      const weights = c.fitnessWeights || MULTIPLEX_DEFAULTS.fitnessWeights;
      const modes = c.fitnessModes || MULTIPLEX_DEFAULTS.fitnessModes;
      modal._fit.weights = { ...MULTIPLEX_DEFAULTS.fitnessWeights, ...weights };
      modal._fit.modes = { ...MULTIPLEX_DEFAULTS.fitnessModes, ...modes };
      modal._syncFit();
    }
  }

  // ── Public actions ──

  function openModal() {
    ensureDom();
    hideTooltip();
    populateModal(mx.active ? mx.config : (lastConfig || { ...MULTIPLEX_DEFAULTS, ...loadMultiplexSettings() }));
    document.getElementById(MODAL_ID).classList.add('open');
  }

  function closeModal() {
    hideTooltip();
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('open');
  }

  function begin(config) {
    ensureDom();
    // Derive from the selected simulation — the selected shard while a
    // multiplex is running, otherwise the main sim.
    const source = (mx.active && mx.shards[mx.selected]) ? mx.shards[mx.selected] : getSource();
    setMultiplexPool(mx, null);
    startMultiplex(mx, source, config, grid);
    saveMultiplexSettings(mx.config);
    // MX-20: sims run in a worker pool so the UI thread only renders.
    if (mx.config.useWorkers !== false && typeof Worker !== 'undefined') {
      try {
        const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
        const size = mx.config.workerCount > 0 ? mx.config.workerCount : defaultPoolSize(mx.shards.length, cores);
        setMultiplexPool(mx, createShardPool({ size, spawn: browserSpawn }));
      } catch (err) {
        console.warn('[multiplex] worker pool unavailable, stepping in-thread', err);
        setMultiplexPool(mx, null);
      }
    }
    lastConfig = {
      ...mx.config,
      fitnessWeights: { ...mx.config.fitnessWeights },
      fitnessModes: { ...mx.config.fitnessModes },
    };
    hideTooltip();
    overlay.classList.add('active');
    drawer.classList.remove('hidden');
    drawer.classList.remove('expanded');
    drawer.classList.add('minimized');
    updateDrawer();
    if (bus) bus.emit('multiplex:started', { cols: mx.config.cols, rows: mx.config.rows });
  }

  function exit() {
    if (!mx.active) return;
    const imported = mx.shards[mx.selected];
    const importOnExit = mx.config.importOnExit !== false;
    setMultiplexPool(mx, null);
    stopMultiplex(mx);
    hideTooltip();
    closeMultiplexHelp();
    overlay.classList.remove('active');
    drawer.classList.add('hidden');
    if (imported && importOnExit && applyShard) {
      applyShard(imported);
      if (bus) bus.emit('multiplex:imported', { count: imported.count, speciesCount: imported.speciesCount });
    }
    if (bus) bus.emit('multiplex:exited', {});
  }

  function iterate() {
    if (!mx.active) return;
    // Manual iterate: explicitly re-arm a run that paused on stagnation.
    iterateMultiplex(mx, { manual: true });
    updateDrawer();
  }

  /** Per-shard fitness chips + live stats in the top metrics drawer. */
  function updateMetricsDrawer() {
    if (!metricsDrawer || !mx.active || !mx.shards.length) return;
    const chips = metricsDrawer.querySelector('#mpx-metrics-chips');
    const stats = metricsDrawer.querySelector('#mpx-metrics-stats');
    const report = getFitnessReport(mx);
    if (chips) {
      chips.innerHTML = report.perShard.map((e) => {
        const sel = e.id === mx.selected ? ' selected' : '';
        return `<button class="mpx-metric-chip${sel}" data-shard="${e.id}" type="button">S${String(e.id + 1).padStart(2, '0')} ${formatMetric(e.fitness)}</button>`;
      }).join('');
      chips.querySelectorAll('.mpx-metric-chip').forEach((c) => {
        c.addEventListener('click', () => selectShard(mx, parseInt(c.dataset.shard, 10)));
      });
    }
    if (stats) {
      const sum = summarizeMultiplex(mx);
      const sel = report.perShard.find((e) => e.id === mx.selected);
      const ms = mx.lastTickMs === undefined ? 0 : mx.lastTickMs;
      const best = formatMetric(mx.bestFitness);
      const stag = mx.stagnantGenerations || 0;
      const limit = mx.config.stagnationLimit || 0;
      const stagTxt = limit > 0 ? `${stag}/${limit}` : String(stag);
      stats.textContent = `ALIVE ${sum.alive} · CAP ${sum.populationCap} · ΔSEL ${formatMetric(sel && sel.metrics ? sel.metrics.delta : null)} · ΔAVG ${formatMetric(report.avgDelta)} · ITER ${mx.iteration} · BEST ${best} · STAG ${stagTxt}${mx.stagnantPaused ? ' · ⏸ CONVERGED' : ''} · MS ${formatMetric(ms)}`;
    }
    updateHistTab();
  }

  /**
   * COMPARE/HIST section: per-metric shard comparison matrix (best cell per
   * row highlighted, honoring min/max modes) + generation history with
   * REVERT buttons. Rendered on the 24-frame metrics cadence.
   */
  function updateHistTab() {
    if (!metricsDrawer || !mx.active || !mx.shards.length) return;
    const body = metricsDrawer.querySelector('#mpx-ch-body');
    if (body && body.classList.contains('collapsed')) return;
    const compare = metricsDrawer.querySelector('#mpx-compare');
    const history = metricsDrawer.querySelector('#mpx-history');
    if (compare) {
      const matrix = compareShards(mx);
      const fmt = (v) => (Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : '—');
      compare.innerHTML = `
        <table class="mpx-compare-table">
          <thead><tr>
            <th></th>
            ${matrix.shardIds.map((id) => `
              <th class="mpx-compare-shard${id === mx.selected ? ' selected' : ''}" data-shard="${id}" title="Select S${String(id + 1).padStart(2, '0')}">S${String(id + 1).padStart(2, '0')}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${matrix.rows.map((row) => `
              <tr>
                <td title="${row.key} (${row.mode})">${row.key.toUpperCase()}</td>
                ${row.values.map((v, i) => {
                  const id = matrix.shardIds[i];
                  return `<td class="mpx-compare-val${id === row.bestId ? ' best' : ''}">${fmt(v)}</td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`;
      compare.querySelectorAll('.mpx-compare-shard').forEach((th) => {
        th.addEventListener('click', () => selectShard(mx, parseInt(th.dataset.shard, 10)));
      });
    }
    if (history) {
      history.innerHTML = mx.history.map((entry) => {
        const current = entry.generation === mx.iteration;
        const best = formatMetric(entry.bestFitness);
        return `<div class="mpx-hist-row${current ? ' current' : ''}">
          <span class="mpx-hist-gen">G${entry.generation}</span>
          <span class="mpx-hist-best">BEST ${best}</span>
          <button class="mpx-btn mpx-hist-revert" data-gen="${entry.generation}" type="button" ${current ? 'disabled' : ''}>${current ? 'LIVE' : '◀ REVERT'}</button>
        </div>`;
      }).join('');
      history.querySelectorAll('.mpx-hist-revert').forEach((btn) => {
        btn.addEventListener('click', () => revertTo(parseInt(btn.dataset.gen, 10)));
      });
    }
  }

  /** Rebuild the grid from a recorded generation (the revert is undoable). */
  function revertTo(generation) {
    if (!mx.active) return;
    if (revertMultiplex(mx, generation)) {
      updateDrawer();
      if (bus) bus.emit('multiplex:reverted', { generation });
    }
  }

  function updateDrawer() {
    if (!drawer) return;
    const gridStat = drawer.querySelector('#mpx-stat-grid');
    const selStat = drawer.querySelector('#mpx-stat-selected');
    const iterStat = drawer.querySelector('#mpx-stat-iteration');
    if (gridStat) gridStat.textContent = `${mx.config.cols}×${mx.config.rows} · ${mx.shards.length} SIMS`;
    if (selStat) selStat.textContent = `SELECTED S${String(mx.selected + 1).padStart(2, '0')}`;
    if (iterStat) {
      const best = formatMetric(mx.bestFitness);
      const stag = mx.stagnantGenerations || 0;
      const limit = mx.config.stagnationLimit || 0;
      const stagTxt = limit > 0 ? `${stag}/${limit}` : String(stag);
      iterStat.textContent = `ITERATION ${mx.iteration} · BEST ${best} @G${mx.bestIteration} · STAG ${stagTxt}${mx.stagnantPaused ? ' · ⏸ CONVERGED' : ''}`;
    }
    updateMetricsDrawer();
  }

  // Re-select / stats refresh comes through the bus too.
  if (bus) {
    bus.on('multiplex:selected', updateDrawer);
    bus.on('multiplex:stagnant', updateDrawer);
    bus.on('multiplex:reverted', updateDrawer);
  }

  // MX-20 diagnostics: recent main-thread sim (step) and render ms per frame.
  const perf = { step: [], render: [] };
  function pushPerf(kind, ms) {
    const a = perf[kind];
    a.push(ms);
    if (a.length > 240) a.shift();
  }
  function perfSummary() {
    const med = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
    const p95 = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * 0.95))]; };
    return {
      stepMedMs: med(perf.step), stepP95Ms: p95(perf.step), renderMedMs: med(perf.render), renderP95Ms: p95(perf.render),
      pool: mx.pool ? mx.pool.size : 0, ticks: mx.shards.map((sh) => sh.tick),
    };
  }

  return {
    mx,
    perfSummary,
    openModal,
    closeModal,
    exit,
    iterate,
    isActive: () => mx.active,
    step: (dt, simSpeed, worldSize) => {
      if (!mx.active) return;
      const r = frameMultiplex(mx, dt, simSpeed, worldSize);
      pushPerf('step', r.mainMs);
      if (++metricsFrame % 24 === 0) updateMetricsDrawer();
    },
    render: (worldSize) => {
      if (!mx.active) return;
      const t0 = performance.now();
      renderMultiplex(mx, worldSize);
      pushPerf('render', performance.now() - t0);
    },
    resize: () => {
      if (mx.active) resizeMultiplex(mx);
    },
  };
}
