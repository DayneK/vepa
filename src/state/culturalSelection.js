/**
 * VEPA4 — Cultural selection terms (MD-CULT, AC-45).
 *
 * Two biases layered on top of civilization.transmitCulture's fidelity roll:
 *
 *  - Prestige bias: learners copy high-prestige models more faithfully.
 *    prestigeFidelity() raises fidelity when the source outranks the receiver
 *    and lowers it when the source is lower-status.
 *  - Environmental selection: after transmission, each symbol is scored
 *    against the receiving group's environment; symbols whose fitness falls
 *    below a threshold are dropped. Fitness is a deterministic hash of the
 *    symbol's root name against the environment vector, so replays agree.
 *
 * Pure functions plus one helper that applies both through the existing
 * registry API. Never reads or writes particle stride fields.
 */
import { transmitCulture } from './civilization.js';
import { updateSystemRecord } from './systemLifecycle.js';

export const PRESTIGE_WEIGHT = 0.4;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Fidelity after prestige bias. Prestige values are in [0, 1]. */
export function prestigeFidelity(base, sourcePrestige, receiverPrestige, weight = PRESTIGE_WEIGHT) {
  const gap = clamp01(sourcePrestige) - clamp01(receiverPrestige);
  return clamp01(base + weight * gap * (gap > 0 ? 1 - base : base));
}

/** Prestige of a group from size, treasury and stability (all bounded). */
export function groupPrestige(group) {
  if (!group) return 0;
  const size = group.members ? group.members.size || group.members.length || 0 : 0;
  const s = size / (size + 10);
  const t = Math.max(0, group.treasury || 0); const tt = t / (t + 50);
  const st = clamp01(group.stability ?? 0.5);
  return clamp01(0.4 * s + 0.4 * tt + 0.2 * st);
}

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h / 4294967296;
}

/**
 * Fitness of a symbol in an environment {scarcity, threat, density} ∈ [0,1]³.
 * Each symbol root has a deterministic preferred environment; fitness falls
 * with distance from it. Mutations ('*', '~n') share their root's niche.
 */
export function symbolFitness(symbol, env = {}) {
  const root = String(symbol).replace(/[*~].*$/, '');
  const pref = [hash01(`${root}:s`), hash01(`${root}:t`), hash01(`${root}:d`)];
  const e = [clamp01(env.scarcity ?? 0.5), clamp01(env.threat ?? 0.5), clamp01(env.density ?? 0.5)];
  const d = Math.hypot(pref[0] - e[0], pref[1] - e[1], pref[2] - e[2]) / Math.sqrt(3);
  return 1 - d;
}

/** Split symbols into kept/dropped by environmental fitness. */
export function environmentalSelection(symbols, env, threshold = 0.5) {
  const kept = [], dropped = [];
  for (const s of symbols) (symbolFitness(s, env) >= threshold ? kept : dropped).push(s);
  return { kept, dropped };
}

/**
 * Transmit between two cultures with both biases: prestige sets the fidelity,
 * then environmental selection prunes the receiver's symbols.
 */
export function transmitWithSelection(registry, fromCultureId, toCultureId, { baseFidelity = 0.7, sourcePrestige = 0.5, receiverPrestige = 0.5, env = null, threshold = 0.5, mode = 'horizontal' } = {}) {
  const fidelity = prestigeFidelity(baseFidelity, sourcePrestige, receiverPrestige);
  const result = transmitCulture(registry, fromCultureId, toCultureId, { fidelity, mode });
  let dropped = [];
  const rec = registry.lifecycle.records.get(toCultureId);
  if (rec) {
    // Re-learning a symbol the receiver already holds does not duplicate it.
    const unique = [...new Set(rec.attributes.symbols)];
    const sel = env ? environmentalSelection(unique, env, threshold) : { kept: unique, dropped: [] };
    updateSystemRecord(registry.lifecycle, toCultureId, { attributes: { symbols: sel.kept } });
    dropped = sel.dropped;
  }
  return { ...result, fidelity, selectedOut: dropped };
}
