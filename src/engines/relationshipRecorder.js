/**
 * VEPA4 — Relationship laboratory, stage 1: recorder (MD-REL, AC-46).
 *
 * A bounded ring of relationship events (kin, care, ally, rival, trade,
 * citizen) as they happen in the live sim. Stage 2 (relationshipFeatures.js)
 * turns a window of events into features; stage 3 (relationshipRegimes.js)
 * classifies the window into a social regime.
 */
export const DEFAULT_RECORDER_CAP = 512;

export function createRelationshipRecorder(cap = DEFAULT_RECORDER_CAP) {
  return { cap: Math.max(1, cap | 0), events: [], total: 0 };
}

/** Record one event {tick, type, a, b, weight?}. Returns the stored event. */
export function recordRelationshipEvent(rec, { tick = 0, type, a, b, weight = 1 }) {
  const ev = { tick, type, a, b, weight };
  rec.events.push(ev); rec.total++;
  if (rec.events.length > rec.cap) rec.events.splice(0, rec.events.length - rec.cap);
  return ev;
}

/** Events with tick in (sinceTick, untilTick]. */
export function eventsInWindow(rec, sinceTick, untilTick = Infinity) {
  return rec.events.filter((e) => e.tick > sinceTick && e.tick <= untilTick);
}

export function serializeRecorder(rec) { return { version: 1, cap: rec.cap, total: rec.total, events: rec.events.map((e) => ({ ...e })) }; }
export function restoreRecorder(s) {
  if (!s || s.version !== 1) return createRelationshipRecorder();
  const rec = createRelationshipRecorder(s.cap);
  rec.total = s.total || 0; rec.events = (s.events || []).slice(-rec.cap).map((e) => ({ ...e }));
  return rec;
}
