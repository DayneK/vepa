// SPEC-HELP / CA-H8: the spec generator loads the live help catalogue (no regex)
// and must report full canonical LAW_HELP_DB coverage. A regression to the old
// regex extraction showed 0/136 here.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LAW_INDEXES } from '../../src/constants/laws.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const script = `${root}scripts/generate-spec.mjs`;

describe('spec generator help coverage', () => {
  it('reports canonical LAW_HELP_DB coverage for every law', () => {
    // --check never writes; its exit code depends on spec freshness, which is
    // repository:check's job, so only the coverage line is asserted here.
    const run = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8' });
    const m = /Canonical LAW_HELP_DB coverage: (\d+)\/(\d+)/.exec(run.stdout);
    expect(m, run.stdout + run.stderr).not.toBeNull();
    const total = Object.keys(LAW_INDEXES).length;
    expect(Number(m[2])).toBe(total);
    expect(Number(m[1])).toBe(total);
  }, 30000);
  it('contains no regex extraction of the help/parameter catalogues', () => {
    const src = readFileSync(script, 'utf8');
    expect(src).not.toMatch(/match\(\/export const (LAW_HELP_DB|LAW_PARAMETERS|LAW_HELP_PATCHES|MECHANICS_HELP)/);
    expect(src).toMatch(/from '\.\.\/src\/constants\/help\.js'/);
  });
});
