// ARP-9 (AC-26) + ACO-3 (AC-29): audit provenance records carry stage,
// producer, date and source revision; the check fails when one is missing;
// the a3 reports are retained historical records (D-009).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateManifest, validateProvenance } from '../../scripts/validate-provenance.mjs';

const PATH = 'docs/audit/provenance.json';
const manifest = JSON.parse(readFileSync(PATH, 'utf8'));

describe('audit provenance headers (ARP-9)', () => {
  it('every record has stage, producer, date and sourceRevision, and the check passes', () => {
    for (const r of manifest.records) for (const k of ['stage', 'producer', 'date', 'sourceRevision']) expect(r[k], `${r.path} ${k}`).toBeTruthy();
    expect(validateProvenance()).toEqual([]);
  });
  it.each(['stage', 'producer', 'date', 'sourceRevision'])('fails when %s is missing', (key) => {
    const broken = structuredClone(manifest);
    delete broken.records[0][key];
    expect(validateManifest(PATH, broken).join('\n')).toMatch(new RegExp(`missing provenance header ${key}`));
  });
});

describe('a3 retention (ACO-3, D-009)', () => {
  it('marks the a3 reports as retained historical records and cites D-009', () => {
    expect(manifest.retentionDecision).toMatch(/D-009/);
    for (const r of manifest.records) expect(r.status).toBe('retained-historical');
    const ownership = readFileSync('docs/AUDIT_CORPUS_OWNERSHIP.md', 'utf8');
    expect(ownership).toMatch(/D-009/);
  });
});
