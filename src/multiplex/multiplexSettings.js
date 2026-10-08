// ============================================================================
// Chaos Multiplex performance settings persistence (MX-20, AC-95).
// The preview knobs (preset, particles per sim, law tier, light law set, tick
// scheduling, workers) are saved to localStorage and restored on next open.
// ============================================================================
import { MULTIPLEX_PRESETS, TICK_MODES, MULTIPLEX_DEFAULTS } from './multiplex.js';
import { sanitizeLawNames } from './previewLaws.js';

export const MULTIPLEX_SETTINGS_KEY = 'vepa-multiplex-settings';
export const PERSISTED_KEYS = Object.freeze([
  'preset', 'cols', 'rows', 'particlesPerSim', 'populationPercent', 'lawTier', 'lightLaws',
  'tickMode', 'ticksPerSecond', 'frameBudgetMs', 'useWorkers', 'workerCount',
  'refillToCap', // D-030
]);
export const PARTICLES_PER_SIM_MIN = 125;
export const PARTICLES_PER_SIM_MAX = 2500;

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

/** Validate a settings object; unknown keys dropped, bad values defaulted. */
export function sanitizeMultiplexSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = MULTIPLEX_DEFAULTS;
  const out = {};
  if (typeof r.preset === 'string' && (MULTIPLEX_PRESETS[r.preset] || r.preset === 'custom')) out.preset = r.preset;
  if (r.cols !== undefined) out.cols = Math.round(clamp(r.cols, 1, 5, d.cols));
  if (r.rows !== undefined) out.rows = Math.round(clamp(r.rows, 1, 5, d.rows));
  if (r.particlesPerSim !== undefined) {
    const p = Math.round(clamp(r.particlesPerSim, 0, PARTICLES_PER_SIM_MAX, 0));
    out.particlesPerSim = p === 0 ? 0 : Math.max(PARTICLES_PER_SIM_MIN, p);
  }
  if (r.populationPercent !== undefined) out.populationPercent = clamp(r.populationPercent, 0, 100, 0);
  if (r.lawTier !== undefined) out.lawTier = r.lawTier === 'light' ? 'light' : 'full';
  if (r.lightLaws !== undefined) {
    const names = r.lightLaws === null ? [] : sanitizeLawNames(r.lightLaws);
    out.lightLaws = names.length ? names : null;
  }
  if (r.tickMode !== undefined) out.tickMode = TICK_MODES.includes(r.tickMode) ? r.tickMode : 'frame';
  if (r.ticksPerSecond !== undefined) out.ticksPerSecond = clamp(r.ticksPerSecond, 0.5, 240, d.ticksPerSecond);
  if (r.frameBudgetMs !== undefined) out.frameBudgetMs = clamp(r.frameBudgetMs, 1, 14, d.frameBudgetMs);
  if (r.useWorkers !== undefined) out.useWorkers = r.useWorkers !== false;
  if (r.refillToCap !== undefined) out.refillToCap = r.refillToCap !== false;
  if (r.workerCount !== undefined) out.workerCount = Math.round(clamp(r.workerCount, 0, 16, 0));
  return out;
}

function storageOrNull(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadMultiplexSettings(storage) {
  const s = storageOrNull(storage);
  if (!s) return {};
  try { return sanitizeMultiplexSettings(JSON.parse(s.getItem(MULTIPLEX_SETTINGS_KEY) || '{}')); } catch { return {}; }
}

export function saveMultiplexSettings(config, storage) {
  const s = storageOrNull(storage);
  if (!s || !config) return false;
  const pick = {};
  for (const k of PERSISTED_KEYS) if (config[k] !== undefined) pick[k] = config[k];
  try { s.setItem(MULTIPLEX_SETTINGS_KEY, JSON.stringify(sanitizeMultiplexSettings(pick))); return true; } catch { return false; }
}
