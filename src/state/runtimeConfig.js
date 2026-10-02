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
  starMass: 12,        // mass threshold for gravitational collapse (star)
  visualScale: 1.0,    // global particle size multiplier
  globalAlpha: 1.0,    // global particle opacity multiplier
  simSpeed: 1.0,       // physics time-step multiplier
  // v4 — goal-engine adjustable knobs (bounded by GoalEngine parameter ranges)
  maxForce: 50.0,      // global force clamp ceiling (solver MAX_FORCE is hard cap)
  forceScale: 1.0,     // global force multiplier applied before clamping
  dragMultiplier: 1.0, // global velocity damping multiplier (0.8–1.0)
  birthRate: 1.0,      // REPRO law synergy multiplier (0.01–1.0)
  deathRate: 1.0,      // LIFE law synergy multiplier (0.01–1.0)
  signalScale: 1.0,    // global communication DNA multiplier
  // v8.17 — gravity engine: 'reference' (default, per-pair DNA-aware reference
  // CPU solver; 'exact' is a permanent legacy alias), 'bh'
  // (Barnes–Hut monopole, O(N log N)), or 'fmm' (BH + quadrupole correction,
  // ~10× more accurate at the same theta). gravTheta is the opening angle
  // (0 = exact traversal; 0.4–0.7 typical). See src/physics/octree.js.
  gravEngine: 'reference', // legacy alias 'exact' behaves identically
  gravTheta: 0.5,
  // FIELD-ONCE (D-016): true (default) = the field medium advances once per tick;
  // false = legacy, once per particle per tick. See docs/GOLDEN-REBASELINE.md.
  fieldAdvanceOnce: true,
  // v9.0 — compute engine: GPU is the user-facing default. The worker probes
  // WebGPU once and falls back to the validated CPU path when unavailable;
  // explicit CPU selection remains available in SETTINGS > COMPUTE.
  computeEngine: 'gpu',
  // v9.1.22 — browser presentation backend. Canvas2D remains the safe
  // reference default; PixiJS is opt-in until browser benchmark evidence is
  // available for the target device and population.
  renderBackend: savedRenderBackend,
  worldParams: createWorldParams(), // WORLD panel sliders (SPACE/PHYSICS/ENVIRONMENT/BIOLOGY)
};

/** Gravity engines accepted by runtimeConfig.gravEngine. */
export const GRAV_ENGINES = Object.freeze(['reference', 'bh', 'fmm']);

/**
 * Canonical gravity-engine name. 'exact' is the permanent legacy alias for
 * 'reference' (the default per-pair CPU solver); anything unrecognised also
 * falls back to 'reference', matching how solve() dispatches.
 */
export function normalizeGravEngine(value) {
  if (value === 'exact') return 'reference';
  return GRAV_ENGINES.includes(value) ? value : 'reference';
}
