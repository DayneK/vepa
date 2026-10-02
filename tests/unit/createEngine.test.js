// CA-A7: shared engine factory; engine public handles keep their shape.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEngine } from '../../src/engines/createEngine.js';
import { createInsightEngine } from '../../src/engines/insightEngine.js';
import { createGoalEngine } from '../../src/engines/goalEngine.js';
import { createTimelineEngine } from '../../src/engines/timelineEngine.js';
import { createNarrativeEngine } from '../../src/engines/narrativeEngine.js';

const bus = { on() {}, emit() {} };

describe('createEngine (CA-A7)', () => {
  it('merges config over defaults and starts at frame 0', () => {
    const e = createEngine(bus, { a: 1, b: 2 }, { b: 3 }, (cfg) => ({ twice: cfg.b * 2 }));
    expect(e).toEqual({ bus, cfg: { a: 1, b: 3 }, frame: 0, twice: 6 });
  });
  it('is used by at least 3 engines', () => {
    const users = ['insightEngine', 'goalEngine', 'timelineEngine', 'narrativeEngine']
      .filter((f) => /createEngine\(bus, DEFAULTS, config/.test(readFileSync(new URL(`../../src/engines/${f}.js`, import.meta.url), 'utf8')));
    expect(users.length).toBeGreaterThanOrEqual(3);
  });
  it('engine handles keep their pre-factory fields', () => {
    expect(Object.keys(createInsightEngine(bus)).sort()).toEqual(['bus', 'cfg', 'frame', 'history', 'lastClusters']);
    expect(Object.keys(createGoalEngine(bus)).sort()).toEqual(['bus', 'cfg', 'currentValues', 'frame', 'goals', 'history']);
    expect(Object.keys(createTimelineEngine(bus)).sort()).toEqual(['bus', 'cfg', 'frame', 'isScrubbing', 'nextIndex', 'snapshots']);
    expect(Object.keys(createNarrativeEngine(bus)).sort()).toEqual(['bus', 'cfg', 'entries', 'frame', 'lastEmit', 'lastFrame', 'recentEvents']);
    const g = createGoalEngine(bus, { stabilityTarget: 0.42 });
    expect(g.goals.stability).toBe(0.42);
  });
});
