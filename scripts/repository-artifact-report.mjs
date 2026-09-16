#!/usr/bin/env node
// Read-only repository artifact inventory. No files are modified.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));

const EXPORTS = [
  { path: 'exports/vepa-full-codebase-concat.md', kind: 'full-codebase-snapshot', producer: 'exports/generate-vepa-all.mjs → exports/generate-full-concat.mjs', status: 'retained-derived-artifact' },
  { path: 'exports/vepa-docs-concat.md', kind: 'documentation-snapshot', producer: 'exports/generate-docs-concat.mjs', status: 'retained-derived-artifact' },
  { path: 'exports/vepa-codebase-full-concat.md', kind: 'legacy-or-parallel-full-snapshot', producer: 'not uniquely established', status: 'provenance-review-required' },
];

const TOOLS = [
  { path: 'exports/generate-vepa-all.mjs', status: 'active-maintenance-orchestrator', mutation: 'writes export snapshots' },
  { path: 'exports/generate-full-concat.mjs', status: 'active-maintenance-generator', mutation: 'writes requested output file' },
  { path: 'exports/generate-docs-concat.mjs', status: 'active-maintenance-generator', mutation: 'writes documentation snapshot' },
  { path: 'scripts/patch-lawcat-test.mjs', status: 'historical-migration-utility', mutation: 'mutates tests/unit/lawCategories.test.js' },
  { path: 'tests/run.mjs', status: 'archived-legacy-runner', mutation: 'executes obsolete node:test harness' },
];

function inspect(entry) {
  const full = join(ROOT, entry.path);
  if (!existsSync(full)) return { ...entry, exists: false };
  const stat = statSync(full);
  return { ...entry, exists: true, bytes: stat.size };
}

export function inspectRepositoryArtifacts() {
  return {
    generatedAt: 'runtime',
    exports: EXPORTS.map(inspect),
    tooling: TOOLS.map(inspect),
    policy: {
      sourceOfTruth: 'src/ and executable tests',
      exports: 'derived review artifacts; retain until provenance and consumer mapping are resolved',
      historicalTools: 'retain for provenance, exclude from active build/test paths, run only intentionally',
      deletion: 'not authorized by this inventory',
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = inspectRepositoryArtifacts();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('Repository artifact inventory');
    for (const item of [...report.exports, ...report.tooling]) {
      console.log(`${item.exists ? 'present' : 'MISSING'}  ${item.path}  ${item.status}`);
    }
    console.log('No files were modified.');
  }
}
