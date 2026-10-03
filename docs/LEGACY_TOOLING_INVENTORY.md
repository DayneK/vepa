# Legacy Tooling Inventory — Batch 5

**Release context:** VEPA4 9.1.3

| Path | Status | Safe current replacement | Caution |
|---|---|---|---|
| `tests/run.mjs` | Archived VEPA v3-era runner | `npm test` / Vitest | Do not use as current-suite evidence |
| `scripts/patch-lawcat-test.mjs` | Historical migration utility | Edit the current test only through normal review | Mutates `tests/unit/lawCategories.test.js`; targets the retired WRAP/128-law layout, so it refuses to run without `--archive-recovery` and writes only if every pattern matches (guard test: tests/unit/patchLawcatGuard.test.js) |
| `exports/generate-vepa-all.mjs` | Active maintenance orchestrator | `npm run concat` | Writes large derived artifacts |
| `exports/generate-full-concat.mjs` | Active snapshot generator | Invoked by the orchestrator | Requires explicit output path |
| `exports/generate-docs-concat.mjs` | Active documentation snapshot generator | Invoked by the orchestrator | Snapshot content is derived, not SSOT |

## Policy

- Historical tooling remains in place for provenance and recovery.
- Historical tooling is excluded from the active test/build/release path.
- No legacy tool is promoted to current verification authority merely because it still executes.
- Future archival or removal requires consumer search, provenance capture, and a reversible change boundary.

The read-only status check is available through:

```bash
node scripts/repository-artifact-report.mjs
```
