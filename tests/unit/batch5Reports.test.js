import { describe, expect, it } from 'vitest';
import { inspectRepositoryArtifacts } from '../../scripts/repository-artifact-report.mjs';

describe('Batch 5 repository artifact inventory', () => {
  it('classifies export snapshots and historical tools', () => {
    const report = inspectRepositoryArtifacts();
    expect(report.exports).toHaveLength(3);
    expect(report.exports.every((item) => item.exists)).toBe(true);
    expect(report.tooling.find((item) => item.path === 'tests/run.mjs').status)
      .toBe('archived-legacy-runner');
    expect(report.tooling.find((item) => item.path === 'scripts/patch-lawcat-test.mjs').status)
      .toBe('historical-migration-utility');
  });

  it('does not authorize deletion', () => {
    const report = inspectRepositoryArtifacts();
    expect(report.policy.deletion).toMatch(/not authorized/i);
    expect(report.policy.sourceOfTruth).toContain('src/');
  });
});
