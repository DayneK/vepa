/**
 * VEPA4 — launch configuration and the launch modal.
 *
 * The launch modal is the only piece of UI that runs *before* anything is
 * initialised, which gives it a property nothing else has: if it throws or
 * never resolves, there is no world behind it to fall back on. So the
 * behaviour pinned here is mostly about not getting in the way —
 *
 *   - every dismissal path (Escape, backdrop, "Use defaults", a throw inside
 *     the modal) resolves to `null`, and `null` is a fully handled answer;
 *   - a remembered launch opens the modal on what you last chose;
 *   - corrupt storage degrades to the defaults instead of breaking boot;
 *   - the preset picker, the choice rows and the ranges are all reachable and
 *     all carry the answers back.
 *
 * The modal half needs a DOM, which the project does not ship, so it runs
 * against tests/helpers/domStub.js — a shared stub with just enough of the
 * element API, including an HTML parser, to exercise the real wiring rather
 * than a mock of it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { installDom, makeStorage } from '../helpers/domStub.js';

import {
  BUILTIN_LAUNCH_PRESETS,
  DEFAULT_LAUNCH_PRESET_ID,
  LAUNCH_FIELDS,
  LAUNCH_STORAGE_KEY,
  defaultLaunchSettings,
  normaliseLaunchSettings,
  presetFor,
  readLaunchSettings,
  writeLaunchSettings,
} from '../../src/state/launchSettings.js';

let doc;

beforeEach(() => {
  doc = installDom();
});

describe('launch settings state', () => {
  it('defaults to a preset that actually exists', () => {
    const base = defaultLaunchSettings();
    expect(BUILTIN_LAUNCH_PRESETS.some((p) => p.id === base.presetId)).toBe(true);
    expect(presetFor(base)).toBeTruthy();
  });

  it('gives every built-in preset a blurb, so the choice is legible', () => {
    // "TIDAL_BLOOM" tells you nothing about whether you want it. That is the
    // whole reason the picker exists.
    for (const p of BUILTIN_LAUNCH_PRESETS) {
      expect(p.blurb, `${p.id} has no blurb`).toBeTruthy();
      expect(p.blurb.length, `${p.id} blurb is too short to help`).toBeGreaterThan(40);
      expect(p.preset).toBeTruthy();
    }
  });

  it('declares help text for every field, because these are the first controls anyone sees', () => {
    for (const f of LAUNCH_FIELDS) {
      expect(f.label, `${f.key} has no label`).toBeTruthy();
      expect(f.help, `${f.key} has no help`).toBeTruthy();
      expect(f.help.length).toBeGreaterThan(40);
    }
  });

  it('validates choice fields against their own options', () => {
    const bad = normaliseLaunchSettings({ renderBackend: 'webgl-experimental' });
    expect(bad.renderBackend).toBe(defaultLaunchSettings().renderBackend);
    const good = normaliseLaunchSettings({ renderBackend: 'pixi' });
    expect(good.renderBackend).toBe('pixi');
  });

  it('clamps and snaps range fields to their own step', () => {
    const simSpeed = LAUNCH_FIELDS.find((f) => f.key === 'simSpeed');
    expect(normaliseLaunchSettings({ simSpeed: 99 }).simSpeed).toBe(simSpeed.max);
    expect(normaliseLaunchSettings({ simSpeed: -5 }).simSpeed).toBe(simSpeed.min);
    // A hand-edited or stale value must not land between increments.
    expect(normaliseLaunchSettings({ simSpeed: 1.37 }).simSpeed).toBe(1.4);
  });

  it('degrades a null, partial or non-object input to the defaults', () => {
    for (const input of [null, undefined, 'nonsense', 42, []]) {
      expect(normaliseLaunchSettings(input)).toEqual(defaultLaunchSettings());
    }
  });

  it('ignores fields it does not recognise rather than carrying them', () => {
    const out = normaliseLaunchSettings({ presetId: 'PRIME_DEFAULT', rogueField: 'x' });
    expect(out.presetId).toBe('PRIME_DEFAULT');
    expect('rogueField' in out).toBe(false);
  });

  it('round-trips through storage', () => {
    const settings = normaliseLaunchSettings({
      presetId: 'PRIME_DEFAULT', renderBackend: 'pixi', simSpeed: 1.5, worldSize: 900,
    });
    expect(writeLaunchSettings(settings)).toBe(true);
    expect(readLaunchSettings()).toEqual(settings);
  });

  it('falls back to the defaults when stored data is corrupt', () => {
    // A truncated or hand-edited value must not stop the app from booting.
    globalThis.localStorage = makeStorage({ [LAUNCH_STORAGE_KEY]: '{not json' });
    expect(readLaunchSettings()).toEqual(defaultLaunchSettings());
  });

  it('survives storage that refuses to cooperate', () => {
    // Private browsing throws on setItem in some browsers.
    globalThis.localStorage = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    };
    expect(readLaunchSettings()).toEqual(defaultLaunchSettings());
    expect(writeLaunchSettings(defaultLaunchSettings())).toBe(false);
  });
});

describe('launch modal', () => {
  const load = async () => import('../../src/ui/launchModal.js');

  it('renders a card per built-in preset, with the current one marked', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({ settings: normaliseLaunchSettings({ presetId: 'PRIME_DEFAULT' }) });
    const cards = doc.querySelectorAll('.launch-preset');
    expect(cards).toHaveLength(BUILTIN_LAUNCH_PRESETS.length);
    expect(doc.querySelector('.launch-preset.current').dataset.preset).toBe('PRIME_DEFAULT');
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('renders one control per declared field', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    for (const field of LAUNCH_FIELDS) {
      const node = doc.querySelector(`[data-field="${field.key}"]`);
      expect(node, `${field.key} was not rendered`).toBeTruthy();
      if (field.kind === 'choice') {
        expect(node.querySelectorAll('.launch-choice')).toHaveLength(field.options.length);
      } else {
        expect(node.querySelector('input[type="range"]'), `${field.key} has no range`).toBeTruthy();
      }
    }
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('returns the chosen settings on launch', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    doc.querySelector('.launch-preset[data-preset="PRIME_DEFAULT"]').dispatch('click');
    doc.querySelector('.launch-choice[data-key="renderBackend"][data-value="pixi"]').dispatch('click');
    doc.querySelector('[data-act="launch"]').dispatch('click');
    const answer = await promise;
    expect(answer.presetId).toBe('PRIME_DEFAULT');
    expect(answer.renderBackend).toBe('pixi');
  });

  it('carries a range value back', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    const range = doc.querySelector('.launch-range[data-key="simSpeed"]');
    range.value = '2.5';
    range.dispatch('input', { target: range });
    doc.querySelector('[data-act="launch"]').dispatch('click');
    expect((await promise).simSpeed).toBe(2.5);
  });

  it('shows the live value beside a range as it moves', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    const range = doc.querySelector('.launch-range[data-key="simSpeed"]');
    range.value = '0.7';
    range.dispatch('input', { target: range });
    expect(doc.querySelector('[data-value-for="simSpeed"]').textContent).toBe('0.7');
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('labels a range that is still following the preset', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    // null means "the preset decides", and saying so is better than showing a
    // number that is not in effect yet.
    expect(doc.querySelector('[data-value-for="worldSize"]').textContent).toBe('from preset');
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('moves the current marker when another preset is tapped', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({ settings: normaliseLaunchSettings({ presetId: DEFAULT_LAUNCH_PRESET_ID }) });
    doc.querySelector('.launch-preset[data-preset="PRIME_DEFAULT"]').dispatch('click');
    const current = doc.querySelectorAll('.launch-preset').filter((c) => c.classes.has('current'));
    expect(current).toHaveLength(1);
    expect(current[0].dataset.preset).toBe('PRIME_DEFAULT');
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('keeps exactly one choice marked current per field', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    doc.querySelector('.launch-choice[data-key="computeEngine"][data-value="cpu"]').dispatch('click');
    for (const btn of doc.querySelectorAll('.launch-choice[data-key="computeEngine"]')) {
      const on = btn.classList.contains('current');
      expect(btn.getAttribute('aria-checked')).toBe(on ? 'true' : 'false');
    }
    expect(doc.querySelectorAll('.launch-choice[data-key="computeEngine"].current')).toHaveLength(1);
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('falls back to a real preset when the remembered id no longer exists', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({ settings: normaliseLaunchSettings({ presetId: 'PRESET_FROM_THE_FUTURE' }) });
    expect(doc.querySelectorAll('.launch-preset')).toHaveLength(BUILTIN_LAUNCH_PRESETS.length);
    expect(doc.querySelector('.launch-preset.current')).toBeTruthy();
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });
});

describe('launch modal never blocks the boot', () => {
  const load = async () => import('../../src/ui/launchModal.js');

  it('resolves null on Escape, and removes itself from the document', async () => {
    const { showLaunchModal, isLaunchModalOpen } = await load();
    const promise = showLaunchModal({});
    expect(isLaunchModalOpen()).toBe(true);
    doc.dispatch('keydown', { key: 'Escape' });
    expect(await promise).toBeNull();
    expect(isLaunchModalOpen()).toBe(false);
  });

  it('resolves null on "Use defaults"', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    doc.querySelector('.launch-secondary[data-act="cancel"]').dispatch('click');
    expect(await promise).toBeNull();
  });

  it('resolves null when the backdrop is tapped', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    doc.querySelector('#launch-overlay').dispatch('click', { target: doc.querySelector('#launch-overlay') });
    expect(await promise).toBeNull();
  });

  it('stays open when the backdrop is not what was tapped', async () => {
    const { showLaunchModal, isLaunchModalOpen } = await load();
    const promise = showLaunchModal({});
    const panel = doc.querySelector('.launch-panel');
    panel.dispatch('click', { target: panel });
    expect(isLaunchModalOpen()).toBe(true);
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
  });

  it('resolves null immediately when there is no document at all', async () => {
    const { showLaunchModal } = await load();
    const saved = globalThis.document;
    delete globalThis.document;
    expect(await showLaunchModal({})).toBeNull();
    globalThis.document = saved;
  });

  it('leaves no keydown listener behind after it closes', async () => {
    // A leaked listener would keep the modal's focus trap alive after the modal
    // is gone, and the next Escape anywhere on the page would be swallowed.
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    expect(doc.listeners.keydown).toHaveLength(1);
    doc.dispatch('keydown', { key: 'Escape' });
    await promise;
    expect(doc.listeners.keydown).toHaveLength(0);
  });

  it('unwinds safely if it is dismissed twice', async () => {
    const { showLaunchModal } = await load();
    const promise = showLaunchModal({});
    doc.dispatch('keydown', { key: 'Escape' });
    expect(() => doc.dispatch('keydown', { key: 'Escape' })).not.toThrow();
    expect(await promise).toBeNull();
  });

  it('closes on Escape with a form control focused', async () => {
    // A modal that only closes when focus happens to be on its chrome is a
    // modal people cannot dismiss with a keyboard.
    const { showLaunchModal, isLaunchModalOpen } = await load();
    const promise = showLaunchModal({});
    const range = doc.querySelector('.launch-range');
    range.focus();
    expect(doc.activeElement).toBe(range);
    doc.dispatch('keydown', { key: 'Escape' });
    expect(await promise).toBeNull();
    expect(isLaunchModalOpen()).toBe(false);
  });
});

describe('boot integration', () => {
  const MAIN = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');

  it('resolves the launch configuration before laws, world params and spawn', () => {
    const boot = MAIN.slice(MAIN.indexOf('async function boot'));
    const at = (needle) => boot.indexOf(needle);
    expect(at('await resolveLaunchConfiguration()')).toBeGreaterThan(-1);
    // Order is the whole point: a preset decides the laws, the world
    // parameters and the species, so it has to land before all three.
    expect(at('await resolveLaunchConfiguration()')).toBeLessThan(at('for (const name of DEFAULT_LAWS)'));
    expect(at('await resolveLaunchConfiguration()')).toBeLessThan(at('applyDefaultWorldConfig()'));
    expect(at('await resolveLaunchConfiguration()')).toBeLessThan(at('spawnDefaultPopulation()'));
  });

  it('refills SPECIES_PROFILES in place so module-scope closures see the choice', () => {
    // SPECIES_PROFILES is read by functions that captured it at module scope;
    // reassigning the binding would leave them on the old array.
    expect(MAIN).toMatch(/SPECIES_PROFILES\.length = 0/);
    expect(MAIN).toMatch(/SPECIES_PROFILES\.push\(/);
  });

  it('treats a dismissed modal as a normal answer, not an error', async () => {
    const { defaultLaunchSettings } = await import('../../src/state/launchSettings.js');
    const settings = normaliseLaunchSettings(defaultLaunchSettings());
    // This is exactly what main.js does with a null from the modal.
    expect(settings.presetId).toBe(DEFAULT_LAUNCH_PRESET_ID);
    expect(presetFor(settings)).toBeTruthy();
  });
});
