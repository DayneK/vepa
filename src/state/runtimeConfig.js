/**
 * VEPA4 — Mutable runtime tunables
 * Shared across modules so settings sliders, goal-engine adjustments, and
 * signal tuning take effect without rebuilds.
 */
import { createWorldParams } from './worldParams.js';

const savedRenderBackend = typeof localStorage !== 'undefined'
  && localStorage.getItem('vepa-render-backend') === 'pixi'
  ? 'pixi'
  : 'canvas2d';

export const runtimeConfig = {
  starMass: 12,
  visualScale: 1.0,
  globalAlpha: 1.0,
  simSpeed: 1.0,
  maxForce: 50.0,
  forceScale: 1.0,
  dragMultiplier: 1.0,
  birthRate: 1.0,
  deathRate: 1.0,
  signalScale: 1.0,
  gravEngine: 'exact',
  gravTheta: 0.5,
  computeEngine: 'gpu',
  renderBackend: savedRenderBackend,
  worldParams: createWorldParams(),
};

/** Compute tunables changed by automatic planners but committed by restart. */
export const restartRuntimeOverrides = Object.create(null);
const RUNTIME_OVERRIDE_RANGES = Object.freeze({
  simSpeed: [0.1, 10],
  starMass: [4, 100],
  maxForce: [0.1, 50],
  dragMultiplier: [0.8, 1],
  birthRate: [0.01, 1],
  deathRate: [0.01, 1],
});

export function stageRuntimeOverride(key, value) {
  if (key === 'computeEngine') {
    if (value !== 'cpu' && value !== 'gpu') return false;
    if (value === runtimeConfig.computeEngine) delete restartRuntimeOverrides[key];
    else restartRuntimeOverrides[key] = value;
    return true;
  }
  const range = RUNTIME_OVERRIDE_RANGES[key];
  if (!range || typeof value !== 'number' || !Number.isFinite(value)) return false;
  const accepted = Math.max(range[0], Math.min(range[1], value));
  if (accepted === runtimeConfig[key]) delete restartRuntimeOverrides[key];
  else restartRuntimeOverrides[key] = accepted;
  return true;
}

export function commitRuntimeOverrides() {
  const applied = { ...restartRuntimeOverrides };
  Object.assign(runtimeConfig, applied);
  for (const key of Object.keys(restartRuntimeOverrides)) delete restartRuntimeOverrides[key];
  return applied;
}

export function clearRuntimeOverrides() {
  for (const key of Object.keys(restartRuntimeOverrides)) delete restartRuntimeOverrides[key];
}
