/**
 * VEPA4 — SETTINGS is the live authority; the launch modal sets the initial value.
 *
 * `renderBackend` and `computeEngine` were both launch-modal fields *and*
 * SETTINGS controls, with no stated precedence: two owners of one value and no
 * way to tell which one the world was using. A backend change is also not live
 * until a reload, which a select control cannot express.
 *
 * These tests pin the three things that resolve it — a badge that says ACTIVE
 * or PENDING, a one-button path back into the launch default, and a reset that
 * returns both to what the modal chose.
 */
import { describe, expect, it, beforeEach } from 'vitest';

import { installDom } from '../helpers/domStub.js';
import { EventBus } from '../../src/core/eventBus.js';
import { createLawState } from '../../src/state/lawState.js';
import { runtimeConfig, stageRuntimeOverride, restartRuntimeOverrides, clearRuntimeOverrides, commitRuntimeOverrides } from '../../src/state/runtimeConfig.js';
import { readLaunchSettings, writeLaunchSettings, defaultLaunchSettings } from '../../src/state/launchSettings.js';
import { createSettingsPanel } from '../../src/ui/settingsPanel.js';

function mount() {
  const doc = installDom();
  const shell = doc.createElement('div');
  shell.innerHTML = '<div id="laws-panel"></div>';
  doc.body.appendChild(shell);
  const bus = new EventBus();
  bus.on('compute:proposal', ({ parameter, value }) => {
    if (stageRuntimeOverride(parameter, value)) bus.emit('compute:pending', { changes: { ...restartRuntimeOverrides } });
  });
  bus.on('compute:discardPending', () => {
    clearRuntimeOverrides();
    bus.emit('compute:pending', { changes: {} });
  });
  bus.on('sim:restart', () => {
    commitRuntimeOverrides();
    bus.emit('compute:pending', { changes: {} });
    bus.emit('compute:applied');
  });
  return { doc, bus };
}

describe('SETTINGS — backend precedence', () => {
  let doc;
  let bus;

  beforeEach(() => {
    ({ doc, bus } = mount());
    localStorage.clear();
    clearRuntimeOverrides();
    runtimeConfig.computeEngine = 'gpu';
    runtimeConfig.renderBackend = 'canvas2d';
  });

  it('opens showing the live values, not the launch defaults', () => {
    writeLaunchSettings({ ...defaultLaunchSettings(), computeEngine: 'cpu', renderBackend: 'canvas2d' });
    runtimeConfig.computeEngine = 'gpu';
    createSettingsPanel(bus, createLawState());

    const panel = doc.getElementById('laws-panel');
    expect(panel.querySelector('#compute-engine').value).toBe('gpu');
    expect(panel.querySelector('#render-backend').value).toBe('canvas2d');
  });

  it('marks both values ACTIVE on a clean boot and hides the reload button', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    expect(panel.querySelector('#compute-engine-badge').textContent).toBe('ACTIVE');
    expect(panel.querySelector('#render-backend-badge').textContent).toBe('ACTIVE');
    expect(panel.querySelector('#compute-reload').hidden).toBe(true);
  });

  it('marks a changed compute engine PENDING and offers the reload', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    const select = panel.querySelector('#compute-engine');
    select.value = 'cpu';
    select.dispatch('change', {});

    expect(runtimeConfig.computeEngine).toBe('gpu');
    expect(panel.querySelector('#compute-engine').value).toBe('cpu');
    expect(panel.querySelector('[data-compute-pending-status]').textContent).toContain('pending');
    const badge = panel.querySelector('#compute-engine-badge');
    expect(badge.textContent).toBe('PENDING');
    expect(badge.classList.contains('pending')).toBe(true);
    expect(panel.querySelector('#compute-reload').hidden).toBe(false);
    expect(panel.querySelector('#compute-reload').textContent).toContain('RESTART');
  });

  it('marks a changed renderer PENDING too', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    const select = panel.querySelector('#render-backend');
    select.value = 'pixi';
    select.dispatch('change', {});

    expect(runtimeConfig.renderBackend).toBe('pixi');
    expect(panel.querySelector('#render-backend-badge').textContent).toBe('PENDING');
    expect(panel.querySelector('#compute-reload').hidden).toBe(false);
  });

  it('writes the live values back into the launch default on request', () => {
    writeLaunchSettings({ ...defaultLaunchSettings(), computeEngine: 'cpu', renderBackend: 'canvas2d' });
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');

    const select = panel.querySelector('#compute-engine');
    select.value = 'gpu';
    select.dispatch('change', {});
    panel.querySelector('#compute-use-launch').dispatch('click', {});

    // The rest of the launch choice is preserved — this is not a reset.
    const stored = readLaunchSettings();
    expect(stored.computeEngine).toBe('gpu');
    expect(stored.renderBackend).toBe('canvas2d');
    expect(stored.presetId).toBe(defaultLaunchSettings().presetId);
    expect(panel.querySelector('#compute-engine-status').textContent).toContain('Launch default set');
  });

  it('discards a staged backend selection without changing the running backend', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    const select = panel.querySelector('#compute-engine');
    select.value = 'cpu';
    select.dispatch('change', {});
    panel.querySelector('[data-compute-pending-discard]').dispatch('click', {});

    expect(runtimeConfig.computeEngine).toBe('gpu');
    expect(select.value).toBe('gpu');
    expect(panel.querySelector('[data-compute-pending-status]').textContent).toBe('No staged runtime changes.');
    expect(panel.querySelector('#compute-engine-badge').textContent).toBe('ACTIVE');
  });

  it('commits a staged backend only when restart is requested', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    panel.querySelector('#compute-engine').value = 'cpu';
    panel.querySelector('#compute-engine').dispatch('change', {});

    expect(runtimeConfig.computeEngine).toBe('gpu');
    bus.emit('sim:restart');

    expect(runtimeConfig.computeEngine).toBe('cpu');
    expect(panel.querySelector('#compute-engine').value).toBe('cpu');
    expect(panel.querySelector('#compute-engine-badge').textContent).toBe('ACTIVE');
  });

  it('keeps launch renderer choice immediate, but stages compute and can discard both', () => {
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');
    panel.querySelector('#compute-engine').value = 'cpu';
    panel.querySelector('#compute-engine').dispatch('change', {});
    panel.querySelector('#render-backend').value = 'pixi';
    panel.querySelector('#render-backend').dispatch('change', {});

    expect(runtimeConfig.computeEngine).toBe('gpu');
    expect(runtimeConfig.renderBackend).toBe('pixi');
    panel.querySelector('[data-compute-pending-discard]').dispatch('click', {});
    expect(runtimeConfig.computeEngine).toBe('gpu');
    expect(runtimeConfig.renderBackend).toBe('canvas2d');
    expect(panel.querySelector('#render-backend').value).toBe('canvas2d');
    expect(panel.querySelector('[data-compute-pending-status]').textContent).toBe('No staged runtime changes.');
  });

  it('resets both back to the launch choice', () => {
    writeLaunchSettings({ ...defaultLaunchSettings(), computeEngine: 'cpu', renderBackend: 'canvas2d' });
    createSettingsPanel(bus, createLawState());
    const panel = doc.getElementById('laws-panel');

    panel.querySelector('#compute-engine').value = 'gpu';
    panel.querySelector('#compute-engine').dispatch('change', {});
    panel.querySelector('#render-backend').value = 'pixi';
    panel.querySelector('#render-backend').dispatch('change', {});
    expect(panel.querySelector('#compute-reload').hidden).toBe(false);

    panel.querySelector('#compute-reset').dispatch('click', {});

    expect(runtimeConfig.computeEngine).toBe('gpu');
    expect(runtimeConfig.renderBackend).toBe('canvas2d');
    expect(panel.querySelector('#compute-engine').value).toBe('cpu');
    expect(panel.querySelector('[data-compute-pending-status]').textContent).toContain('pending');
    expect(panel.querySelector('#render-backend').value).toBe('canvas2d');
  });

  it('states backend restart and renderer launch-preference behavior on screen', () => {
    createSettingsPanel(bus, createLawState());
    const note = doc.getElementById('laws-panel').querySelector('.setting-note');
    expect(note.textContent).toMatch(/compute backend changes are staged/i);
    expect(note.textContent).toMatch(/world restart/i);
    expect(note.textContent).toMatch(/renderer selection is a launch preference/i);
  });
});
