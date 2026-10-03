// ARP-10 (AC-28): both export snapshots carry producer, date and source
// revision headers, and exports:check passes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseHeader } from '../../exports/export-header.mjs';

describe('export snapshot provenance headers (ARP-10)', () => {
  it.each(['exports/vepa-full-codebase-concat.md', 'exports/vepa-docs-concat.md'])('%s has a provenance header', (p) => {
    const h = parseHeader(readFileSync(p, 'utf8').slice(0, 2000));
    expect(h).not.toBeNull();
    expect(h.producer).toMatch(/npm run concat/);
    expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.sourceRevision).toMatch(/^[0-9a-f]{7,}$/);
  });
  it('exports:check passes', () => {
    const r = spawnSync(process.execPath, ['scripts/check-export-publication.mjs'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });
});
