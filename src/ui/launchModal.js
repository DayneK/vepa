/**
 * VEPA4 — Launch modal.
 *
 * Shown once, before the world exists. It answers the two questions that cannot
 * be answered later without cost: which preset to build the world from, and
 * which engine to run it on. Everything else the drawer can change live.
 *
 * Design rules, in priority order:
 *
 *   1. IT MUST NEVER BLOCK THE BOOT. Escape, the backdrop and the cancel
 *      affordance all resolve to "no choice", and main.js treats that as "use
 *      the defaults". A modal that can trap the boot sequence is a white screen
 *      waiting to happen, and this one runs before anything is initialised, so
 *      a failure here has no fallback behind it.
 *   2. EVERY CONTROL IS TAPPABLE FIRST. The preset cards and the field controls
 *      are 44px minimum under `pointer: coarse` like the rest of the drawer —
 *      this is the first thing anyone sees on a phone, so it gets the treatment
 *      before anything else does.
 *   3. THE FIELDS ARE GENERATED, NOT WRITTEN. They come from LAUNCH_FIELDS, so
 *      a setting's control, its range and its help text cannot drift apart, and
 *      adding one is a single entry in state/launchSettings.js.
 *
 * What it deliberately does not do: ask about anything the drawer already owns.
 * A launch screen that duplicates SETTINGS is a launch screen with two places
 * to be wrong.
 */

import {
  BUILTIN_LAUNCH_PRESETS,
  LAUNCH_FIELDS,
  defaultLaunchSettings,
  normaliseLaunchSettings,
} from '../state/launchSettings.js';
import { escapeHtml as esc } from './html.js';

const TITLE = 'LAUNCH DISH';


/** One preset card. A radio, visually, but a real button underneath. */
function presetCardHtml(entry, selected) {
  const p = entry.preset || {};
  const species = Array.isArray(p.species) ? p.species.length : 0;
  const laws = Array.isArray(p.laws) ? p.laws.length : 0;
  const size = p.worldParams && p.worldParams.worldSize;
  return `<button type="button" class="launch-preset${selected ? ' current' : ''}"
      data-preset="${esc(entry.id)}" aria-pressed="${selected ? 'true' : 'false'}">
    <span class="launch-preset-name">${esc(entry.name)}</span>
    <span class="launch-preset-meta">${species} species · ${laws} laws${size ? ` · world ${size}` : ''}</span>
    <span class="launch-preset-blurb">${esc(entry.blurb)}</span>
  </button>`;
}

/** One declared setting, rendered from its descriptor. */
function fieldHtml(field, value) {
  if (field.kind === 'choice') {
    return `<div class="launch-field" data-field="${esc(field.key)}">
      <div class="launch-field-head">
        <span class="launch-field-label">${esc(field.label)}</span>
        <span class="launch-field-value">${esc(labelForOption(field, value))}</span>
      </div>
      <div class="launch-choices" role="radiogroup" aria-label="${esc(field.label)}">
        ${field.options
          .map(
            (o) => `<button type="button" class="launch-choice${o.value === value ? ' current' : ''}"
            data-key="${esc(field.key)}" data-value="${esc(o.value)}"
            role="radio" aria-checked="${o.value === value ? 'true' : 'false'}">${esc(o.label)}</button>`,
          )
          .join('')}
      </div>
      <p class="launch-help">${esc(field.help)}</p>
    </div>`;
  }
  // Range. The preset supplies the default, which is why the value can be null.
  const current = value === null ? '' : Number(value);
  return `<div class="launch-field" data-field="${esc(field.key)}">
    <label class="launch-field-head" for="launch-${esc(field.key)}">
      <span class="launch-field-label">${esc(field.label)}</span>
      <span class="launch-field-value" data-value-for="${esc(field.key)}">${
        current === '' ? 'from preset' : current
      }</span>
    </label>
    <input class="launch-range" type="range" id="launch-${esc(field.key)}"
      data-key="${esc(field.key)}" min="${field.min}" max="${field.max}" step="${field.step}"
      value="${current === '' ? field.min : current}"
      aria-describedby="launch-help-${esc(field.key)}">
    <p class="launch-help" id="launch-help-${esc(field.key)}">${esc(field.help)}</p>
  </div>`;
}

function labelForOption(field, value) {
  const found = field.options.find((o) => o.value === value);
  return found ? found.label.split('—')[0].trim() : String(value ?? '');
}

/**
 * Show the launch modal.
 *
 * @param {object} [options]
 * @param {object} [options.settings] the settings to start from (normally the
 *                                   last launch choice, so the modal opens on
 *                                   what you picked last time)
 * @param {boolean} [options.isFirstRun] true when nothing has ever been chosen;
 *                                    changes the primary button's wording
 * @returns {Promise<object|null>} the chosen settings, or null if the user
 *          dismissed the modal. Null is a valid, fully-handled answer: main.js
 *          boots the defaults and carries on.
 */
export function showLaunchModal(options = {}) {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settings = normaliseLaunchSettings(options.settings || defaultLaunchSettings());
    // A saved preset id that no longer exists would render an empty picker, so
    // it falls back to the default before anything is drawn.
    if (!BUILTIN_LAUNCH_PRESETS.some((p) => p.id === settings.presetId)) {
      settings = { ...settings, presetId: defaultLaunchSettings().presetId };
    }

    const overlay = document.createElement('div');
    overlay.className = 'launch-overlay';
    overlay.id = 'launch-overlay';
    overlay.innerHTML = `
      <section class="launch-panel" role="dialog" aria-modal="true" aria-labelledby="launch-title">
        <header class="launch-header">
          <div>
            <span class="launch-kicker">VEPA4</span>
            <h1 id="launch-title">${TITLE}</h1>
          </div>
          <button type="button" class="launch-close" data-act="cancel" aria-label="Skip and use defaults">×</button>
        </header>

        <div class="launch-body">
          <h2 class="launch-section-title">PRESET</h2>
          <div class="launch-presets" role="radiogroup" aria-label="Preset">
            ${BUILTIN_LAUNCH_PRESETS.map((p) => presetCardHtml(p, p.id === settings.presetId)).join('')}
          </div>
          <p class="launch-note">Saved presets from WORLD &gt; SAVES can be loaded once the world is running.</p>

          <h2 class="launch-section-title">LAUNCH SETTINGS</h2>
          ${LAUNCH_FIELDS.map((f) => fieldHtml(f, settings[f.key])).join('')}

          <p class="launch-note launch-note-remember">
            Your choice is remembered. Change anything later from SETUP &gt; SETTINGS.
          </p>
        </div>

        <footer class="launch-footer">
          <button type="button" class="launch-secondary" data-act="cancel">Use defaults</button>
          <button type="button" class="launch-primary" data-act="launch">${
            options.isFirstRun ? 'Launch' : 'Launch with these settings'
          }</button>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    // Keep the last focused element so focus can be returned on close.
    const previouslyFocused = typeof document.activeElement === 'object' ? document.activeElement : null;
    const panel = overlay.querySelector('.launch-panel');
    const firstControl = overlay.querySelector('.launch-preset, .launch-primary');
    if (firstControl && typeof firstControl.focus === 'function') firstControl.focus();

    /** Mark the selected preset, keeping every other card and value in step. */
    const selectPreset = (id) => {
      settings = { ...settings, presetId: id };
      for (const card of overlay.querySelectorAll('.launch-preset')) {
        const on = card.dataset.preset === id;
        card.classList.toggle('current', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };

    const setChoice = (key, value) => {
      settings = { ...settings, [key]: value };
      for (const btn of overlay.querySelectorAll(`.launch-choice[data-key="${key}"]`)) {
        const on = btn.dataset.value === String(value);
        btn.classList.toggle('current', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      const field = LAUNCH_FIELDS.find((f) => f.key === key);
      const readout = overlay.querySelector(`[data-value-for="${key}"]`);
      if (field && readout) readout.textContent = labelForOption(field, value);
    };

    overlay.addEventListener('click', (event) => {
      // A tap on the backdrop means "I did not mean to be here". Checking this
      // first matters: without it the backdrop is dead space, and on a phone
      // that is most of the screen.
      if (event.target === overlay) {
        close();
        resolve(null);
        return;
      }
      const act = event.target.closest('[data-act]');
      if (act) {
        // Escape and the backdrop are handled below; both mean "no choice".
        const answer = act.dataset.act === 'launch' ? normaliseLaunchSettings(settings) : null;
        close();
        resolve(answer);
        return;
      }
      const card = event.target.closest('.launch-preset');
      if (card) { selectPreset(card.dataset.preset); return; }
      const choice = event.target.closest('.launch-choice');
      if (choice) { setChoice(choice.dataset.key, choice.dataset.value); }
    });

    overlay.addEventListener('input', (event) => {
      const input = event.target.closest('.launch-range');
      if (!input) return;
      const key = input.dataset.key;
      const value = Number(input.value);
      settings = { ...settings, [key]: value };
      const readout = overlay.querySelector(`[data-value-for="${key}"]`);
      if (readout) readout.textContent = String(value);
    });

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        resolve(null);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      // A modal that lets Tab walk out into the world behind it is not modal.
      const focusable = [...panel.querySelectorAll('button, input, select, [tabindex]')].filter(
        (el) => !el.disabled && el.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    function close() {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    }

    document.addEventListener('keydown', onKey, true);
  });
}

/** True while the launch modal is on screen. Test seam and debug hook. */
export function isLaunchModalOpen() {
  return typeof document !== 'undefined' && Boolean(document.getElementById('launch-overlay'));
}
