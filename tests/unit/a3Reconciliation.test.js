// ACO-2 (AC-27): the a3 reconciliation report is reproducible and lists the
// retired TURBULENCE / CENTRIPETAL / ROTATION claims.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('a3 reconciliation report (ACO-2)', () => {
  it('is up to date with the corpus and manifests', () => {
    const r = spawnSync(process.execPath, ['scripts/a3-reconciliation.mjs', '--check'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });
  it('lists TURBULENCE, CENTRIPETAL and ROTATION as retired claims, and the 128 vs live count', () => {
    const md = readFileSync('docs/audit/A3-RECONCILIATION.md', 'utf8');
    for (const law of ['TURBULENCE', 'CENTRIPETAL', 'ROTATION', 'WRAP']) expect(md).toMatch(new RegExp(`\\| retired or renamed \\| ${law} \\|`));
    expect(md).toMatch(/\| law count \| \(corpus\) \| 128 laws/);
  });
});
