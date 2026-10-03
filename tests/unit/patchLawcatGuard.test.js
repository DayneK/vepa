// The historical lawCategories migration script references retired laws
// (WRAP, 128-law layout); it must refuse to run on the live tree.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('scripts/patch-lawcat-test.mjs guard', () => {
  it('exits non-zero without --archive-recovery and leaves the test file untouched', () => {
    const target = new URL('./lawCategories.test.js', import.meta.url);
    const before = readFileSync(target, 'utf8');
    const r = spawnSync(process.execPath, ['scripts/patch-lawcat-test.mjs'], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/retired WRAP/);
    expect(readFileSync(target, 'utf8')).toBe(before);
  });
  it('even with the flag it writes nothing on the current tree (patterns no longer match)', () => {
    const target = new URL('./lawCategories.test.js', import.meta.url);
    const before = readFileSync(target, 'utf8');
    const r = spawnSync(process.execPath, ['scripts/patch-lawcat-test.mjs', '--archive-recovery'], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(readFileSync(target, 'utf8')).toBe(before);
  });
});
