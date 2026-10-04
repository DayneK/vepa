// MD-REL (AC-46): recorder → features → regimes, fed by live adapter events.
import { describe, it, expect } from 'vitest';
import { createRelationshipRecorder, recordRelationshipEvent, eventsInWindow, serializeRecorder, restoreRecorder } from '../../src/engines/relationshipRecorder.js';
import { extractRelationshipFeatures } from '../../src/engines/relationshipFeatures.js';
import { classifyRelationshipRegime, RELATIONSHIP_REGIMES } from '../../src/engines/relationshipRegimes.js';
import { createCivWorld, runCivWorld } from '../helpers/civWorld.js';

const ev = (type, a, b, tick = 1) => ({ type, a, b, tick });

describe('relationship laboratory (MD-REL)', () => {
  it('recorder is a bounded ring with windows and a JSON round trip', () => {
    const r = createRelationshipRecorder(4);
    for (let t = 1; t <= 6; t++) recordRelationshipEvent(r, ev('kin', 'p:1', `p:${t}`, t));
    expect(r.events.length).toBe(4); expect(r.total).toBe(6);
    expect(eventsInWindow(r, 4).map((e) => e.tick)).toEqual([5, 6]);
    expect(restoreRecorder(JSON.parse(JSON.stringify(serializeRecorder(r))))).toEqual(r);
  });

  it('features measure cooperation, conflict, reciprocity and concentration', () => {
    const f = extractRelationshipFeatures([ev('ally', 'a', 'b'), ev('ally', 'b', 'a'), ev('rival', 'a', 'c'), ev('kin', 'a', 'd')], { spanTicks: 2 });
    expect(f.total).toBe(4);
    expect(f.cooperation).toBeCloseTo(0.75); expect(f.conflict).toBeCloseTo(0.25);
    expect(f.reciprocity).toBeCloseTo(2 / 4);
    expect(f.concentration).toBeCloseTo(4 / 8);
    expect(f.rate).toBe(2);
  });

  it('regimes classify each pattern with an explanation', () => {
    const many = (type, k) => Array.from({ length: k }, (_, i) => ev(type, `p:${i}`, `p:${i + 100}`));
    const cases = [
      [[], 'quiet'],
      [many('rival', 6), 'conflictual'],
      [many('kin', 8), 'kin-dominated'],
      [[...many('ally', 6), ...many('trade', 4)], 'cooperative'],
      [Array.from({ length: 8 }, (_, i) => ev('trade', 'hub', `p:${i}`)), 'hub-and-spoke'],
      [[...many('kin', 3), ...many('rival', 2), ...many('citizen', 4)], 'mixed'],
    ];
    for (const [events, regime] of cases) {
      const out = classifyRelationshipRegime(extractRelationshipFeatures(events));
      expect(out.regime, JSON.stringify(out)).toBe(regime);
      expect(RELATIONSHIP_REGIMES).toContain(out.regime);
      expect(out.reason.length).toBeGreaterThan(0);
    }
  });

  it('consumes live relationship events from the runtime adapter', () => {
    const w = runCivWorld(createCivWorld(), 200);
    expect(w.rt.recorder.total).toBeGreaterThan(0);
    expect(w.rt.regimes.length).toBeGreaterThan(0);
    const rec = w.civ.lifecycle.records.get(w.rt.records['relationship-laboratory']);
    expect(RELATIONSHIP_REGIMES).toContain(rec.attributes.regime);
  });
});
