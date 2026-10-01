/**
 * VEPA4 — Launch configuration.
 *
 * The launch modal asks two questions before the world exists: which preset to
 * build it from, and which engine to run it on. Both answers outlive the
 * session — a world you always have to re-pick the same preset for is a worse
 * world than one that just boots — so they live here rather than in the modal.
 *
 * The split is deliberate: this module is pure data and validation with no DOM,
 * so what a launch *means* is testable, and launchModal.js is reduced to
 * rendering a list of fields and returning the answer.
 */

import { PRIME_DEFAULT, TIDAL_BLOOM } from './defaultPresets.js';

/** Where the last launch choice is kept. */
export const LAUNCH_STORAGE_KEY = 'vepa-launch-settings';

/**
 * The presets offered at launch, with a blurb for each.
 *
 * The blurbs are the reason this is a list of objects rather than the preset
 * constants themselves: "TIDAL_BLOOM" tells you nothing about whether you want
 * it, and the whole point of offering a choice is that the choice is legible.
 */
export const BUILTIN_LAUNCH_PRESETS = Object.freeze([
  {
    id: 'TIDAL_BLOOM',
    name: 'TIDAL BLOOM',
    blurb: 'The default world. A tidal substrate with warm zones, thermal gradients and a rich chemical field — the most alive of the three out of the box.',
    preset: TIDAL_BLOOM,
  },
  {
    id: 'PRIME_DEFAULT',
    name: 'PRIME',
    blurb: 'Five sharply separated archetypes — Predator, Sol, Life, Aether, Void — in a quiet, wide world. Best for seeing species compete.',
    preset: PRIME_DEFAULT,
  },
]);

/** The preset used when nothing has been chosen, or when storage is unusable. */
export const DEFAULT_LAUNCH_PRESET_ID = 'TIDAL_BLOOM';

/**
 * The launch settings, declared rather than written out in the modal so the
 * control, its range and its help text cannot drift apart.
 *
 * `apply` names where the value lands. Keeping the mapping here means adding a
 * setting is one entry, not an entry plus a branch in the modal plus a branch
 * in main.js.
 */
export const LAUNCH_FIELDS = Object.freeze([
  {
    key: 'renderBackend',
    label: 'RENDERER',
    kind: 'choice',
    options: [
      { value: 'canvas2d', label: 'Canvas2D — safe, works everywhere' },
      { value: 'pixi', label: 'PixiJS — GPU batches, best at high population' },
    ],
    help: 'Canvas2D is the reference path and is always correct. PixiJS draws through the GPU and holds up far better with tens of thousands of particles, but is still opt-in until it is benchmarked on your device.',
  },
  {
    key: 'computeEngine',
    label: 'COMPUTE',
    kind: 'choice',
    options: [
      { value: 'gpu', label: 'GPU — WebGPU, falls back to CPU' },
      { value: 'cpu', label: 'CPU — always available' },
    ],
    help: 'GPU is the default: the worker probes for WebGPU once and falls back to the validated CPU path if it is missing. Force CPU if you suspect the GPU path on your device.',
  },
  {
    key: 'simSpeed',
    label: 'SIM SPEED',
    kind: 'range',
    min: 0.1,
    max: 3,
    step: 0.1,
    help: 'Time-step multiplier. Below 1 the world runs in slow motion, which is how you actually watch a law take effect; above 1 it runs fast and you watch populations move.',
  },
  {
    key: 'worldSize',
    label: 'WORLD SIZE',
    kind: 'range',
    min: 400,
    max: 3000,
    step: 50,
    help: 'Edge length of the cubic toroidal world. Density is particle count ÷ volume, so a bigger world with the same population is a sparser, slower dish.',
  },
  {
    key: 'initialPop',
    label: 'INITIAL POPULATION',
    kind: 'range',
    min: 50,
    max: 5000,
    step: 50,
    help: 'How many particles exist at t=0. Everything after this is REPRO and SPAWN_RATE; this is only where the world starts.',
  },
]);

/** A fresh, valid settings object. Never null, never partial. */
export function defaultLaunchSettings() {
  return {
    presetId: DEFAULT_LAUNCH_PRESET_ID,
    renderBackend: 'canvas2d',
    computeEngine: 'gpu',
    simSpeed: 1,
    worldSize: null, // null means "whatever the chosen preset says"
    initialPop: null,
  };
}

/** Clamp/validate one field, falling back to the default when it is unusable. */
function coerceField(field, value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (field.kind === 'choice') {
    return field.options.some((o) => o.value === value) ? value : fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(field.max, Math.max(field.min, n));
  // Snap to the step so a hand-edited value cannot land between increments.
  const snapped = field.min + Math.round((clamped - field.min) / field.step) * field.step;
  return Number(snapped.toFixed(6));
}

/**
 * Coerce anything into a valid settings object. Exported because the modal, the
 * storage read and the tests all need exactly this and must not each grow their
 * own version: a saved object from an older release with a field that no longer
 * exists has to degrade to the default, not to `undefined`.
 */
export function normaliseLaunchSettings(raw) {
  const base = defaultLaunchSettings();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  if (typeof raw.presetId === 'string') out.presetId = raw.presetId;
  for (const field of LAUNCH_FIELDS) {
    if (field.key in raw) out[field.key] = coerceField(field, raw[field.key], base[field.key]);
  }
  return out;
}

/**
 * Read the last launch choice. Tolerates a missing, corrupt or
 * storage-denied `localStorage` — a private-mode browser must still boot.
 */
export function readLaunchSettings() {
  try {
    if (typeof localStorage === 'undefined') return defaultLaunchSettings();
    const raw = localStorage.getItem(LAUNCH_STORAGE_KEY);
    if (!raw) return defaultLaunchSettings();
    return normaliseLaunchSettings(JSON.parse(raw));
  } catch {
    return defaultLaunchSettings();
  }
}

/** Persist a launch choice. Returns false when storage refused it. */
export function writeLaunchSettings(settings) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(LAUNCH_STORAGE_KEY, JSON.stringify(normaliseLaunchSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** True when the user has explicitly chosen, rather than inherited, a launch. */
export function hasLaunchChoice(settings) {
  return settings && settings.presetId !== null && settings.presetId !== undefined;
}

/** The preset object behind a settings object, falling back to the default. */
export function presetFor(settings) {
  const found = BUILTIN_LAUNCH_PRESETS.find((p) => p.id === settings.presetId);
  return found ? found.preset : TIDAL_BLOOM;
}
