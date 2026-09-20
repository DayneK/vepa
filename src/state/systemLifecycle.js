/**
 * VEPA4 — Cross-system lifecycle substrate (Phases 2–5).
 *
 * This is a generic, additive registry for system observations. It does not
 * replace group, lineage, economy, or physics state and never writes particle
 * stride fields. Domain modules may attach stable subjects and explicit events;
 * analysis can then derive bounded regime evidence without inventing entities.
 */
import { SYSTEM_FOUNDATION, SYSTEM_FOUNDATION_ORDER } from './systemFoundation.js';

const PHASES = Object.freeze({
  1: 'evidence-contract',
  2: 'durable-records',
  3: 'causal-events',
  4: 'emergent-evidence',
  5: 'analysis-report',
});

const DEFAULT_EVENT_CAP = 256;
const DEFAULT_RECORD_CAP = 2048;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, finite(value)));
}

function assertSystem(systemId) {
  if (!SYSTEM_FOUNDATION[systemId]) throw new Error(`Unknown system: ${systemId}`);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export { PHASES };

export function createSystemLifecycle(options = {}) {
  return {
    records: new Map(),
    events: [],
    sequence: new Map(),
    clock: finite(options.clock, 0),
    eventCap: Math.max(1, Math.floor(options.eventCap || DEFAULT_EVENT_CAP)),
    recordCap: Math.max(1, Math.floor(options.recordCap || DEFAULT_RECORD_CAP)),
  };
}

/** Create a durable record with a deterministic system-local identifier. */
export function createSystemRecord(lifecycle, systemId, subjectId, attributes = {}) {
  assertSystem(systemId);
  const sequence = (lifecycle.sequence.get(systemId) || 0) + 1;
  lifecycle.sequence.set(systemId, sequence);
  const id = `${systemId}:${sequence}`;
  const now = ++lifecycle.clock;
  const record = {
    id,
    systemId,
    subjectId: subjectId ?? id,
    phase: 2,
    status: 'active',
    evidence: SYSTEM_FOUNDATION[systemId].evidence,
    createdAt: now,
    updatedAt: now,
    metrics: {},
    attributes: clone(attributes) || {},
  };
  lifecycle.records.set(id, record);
  trimRecords(lifecycle);
  return clone(record);
}

/** Update a durable record without changing its stable identity. */
export function updateSystemRecord(lifecycle, recordId, patch = {}) {
  const record = lifecycle.records.get(recordId);
  if (!record) return null;
  if (patch.systemId && patch.systemId !== record.systemId) {
    throw new Error('A system record cannot change systems');
  }
  const now = ++lifecycle.clock;
  if (patch.attributes) record.attributes = { ...record.attributes, ...clone(patch.attributes) };
  if (patch.metrics) record.metrics = { ...record.metrics, ...clone(patch.metrics) };
  if (patch.status) record.status = patch.status;
  record.updatedAt = now;
  return clone(record);
}

/** Append an explicit causal event and attach it to the durable record. */
export function recordSystemEvent(lifecycle, recordId, type, payload = {}) {
  const record = lifecycle.records.get(recordId);
  if (!record) return null;
  const event = {
    id: `${recordId}:event:${lifecycle.events.length + 1}`,
    recordId,
    systemId: record.systemId,
    type,
    at: ++lifecycle.clock,
    payload: clone(payload) || {},
  };
  lifecycle.events.push(event);
  if (lifecycle.events.length > lifecycle.eventCap) lifecycle.events.shift();
  record.phase = Math.max(record.phase, 3);
  record.updatedAt = event.at;
  record.metrics.events = (record.metrics.events || 0) + 1;
  record.metrics[type] = (record.metrics[type] || 0) + 1;
  return clone(event);
}

/** Close a record while retaining its history for analysis. */
export function closeSystemRecord(lifecycle, recordId, reason = 'closed') {
  const record = lifecycle.records.get(recordId);
  if (!record) return null;
  record.status = 'closed';
  record.phase = Math.max(record.phase, 3);
  record.updatedAt = ++lifecycle.clock;
  record.attributes.closeReason = reason;
  return clone(record);
}

/** Derive bounded emergence evidence from event density and explicit confidence. */
export function deriveSystemEvidence(lifecycle, systemId, options = {}) {
  assertSystem(systemId);
  const records = [...lifecycle.records.values()].filter((r) => r.systemId === systemId);
  const events = lifecycle.events.filter((e) => e.systemId === systemId);
  const eventCount = events.length;
  const activeRecords = records.filter((r) => r.status === 'active').length;
  const threshold = Math.max(1, Math.floor(options.eventThreshold || 3));
  const explicitConfidence = records.length
    ? records.reduce((sum, record) => sum + clamp01(record.attributes.confidence), 0) / records.length
    : 0;
  const persistence = records.length
    ? records.reduce((sum, record) => sum + (record.status === 'active' ? 1 : 0), 0) / records.length
    : 0;
  const score = clamp01((Math.min(1, eventCount / threshold) * 0.5) + (persistence * 0.3) + (explicitConfidence * 0.2));
  return {
    systemId,
    phase: score >= 0.5 ? 4 : 3,
    eventCount,
    recordCount: records.length,
    activeRecords,
    persistence,
    confidence: score,
    regime: score >= 0.75 ? 'stable-pattern' : score >= 0.5 ? 'emerging-pattern' : 'insufficient-evidence',
  };
}

/** Produce the Phase 5 report for one system or all systems. */
export function analyzeSystems(lifecycle, systemId = null) {
  const ids = systemId ? [systemId] : SYSTEM_FOUNDATION_ORDER;
  return ids.map((id) => {
    const evidence = deriveSystemEvidence(lifecycle, id);
    return {
      ...evidence,
      phase: 5,
      breadthRank: SYSTEM_FOUNDATION[id].breadthRank,
      implementationEvidence: SYSTEM_FOUNDATION[id].evidence,
      sourceAnchors: [...SYSTEM_FOUNDATION[id].sourceAnchors],
      causalEvents: lifecycle.events.filter((event) => event.systemId === id).map(clone),
    };
  });
}

export function getSystemPhaseStatus(lifecycle, systemId) {
  assertSystem(systemId);
  const evidence = deriveSystemEvidence(lifecycle, systemId);
  return {
    systemId,
    phaseOne: PHASES[1],
    phaseTwo: evidence.recordCount > 0 ? 'complete' : 'ready',
    phaseThree: evidence.eventCount > 0 ? 'complete' : 'ready',
    phaseFour: evidence.phase >= 4 ? 'complete' : 'ready',
    phaseFive: 'available',
  };
}

export function serializeSystemLifecycle(lifecycle) {
  return {
    version: 1,
    clock: lifecycle.clock,
    sequence: Object.fromEntries(lifecycle.sequence),
    records: [...lifecycle.records.values()].map(clone),
    events: lifecycle.events.map(clone),
  };
}

export function restoreSystemLifecycle(snapshot, options = {}) {
  const lifecycle = createSystemLifecycle(options);
  if (!snapshot || snapshot.version !== 1) return lifecycle;
  lifecycle.clock = finite(snapshot.clock, 0);
  lifecycle.sequence = new Map(Object.entries(snapshot.sequence || {}).map(([id, value]) => [id, finite(value)]));
  for (const record of snapshot.records || []) {
    if (SYSTEM_FOUNDATION[record.systemId] && record.id) lifecycle.records.set(record.id, clone(record));
  }
  lifecycle.events = (snapshot.events || []).filter((event) => SYSTEM_FOUNDATION[event.systemId]).map(clone).slice(-lifecycle.eventCap);
  return lifecycle;
}

function trimRecords(lifecycle) {
  while (lifecycle.records.size > lifecycle.recordCap) {
    const oldest = lifecycle.records.keys().next().value;
    lifecycle.records.delete(oldest);
  }
}
