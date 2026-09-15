# VEPA4 — Concatenated Snapshots

Machine-readable single-file exports of the current working tree. These files are derived artifacts, not runtime source or documentation SSOT. Their headers and contents are regenerated from the worktree; do not treat embedded branch, commit, or version text as current repository metadata.

| File | What it is | Regenerate |
|------|------------|------------|
| `vepa-codebase-concat.mjs` | Minimal functional core — 20 headless-runnable modules (constants → state → dna → physics → spawn) merged into one self-contained ESM file via a `__define`/`__import` registry. No UI/render/worker glue. | `node exports/generate-concat.mjs` |
| `vepa-full-codebase-concat.md` | Generated hierarchical source snapshot; excludes generated documentation, audit corpora, and its own large output files. | `node exports/generate-vepa-all.mjs` |
| `vepa-docs-concat.md` | Comprehensive documentation snapshot — all 112 markdown docs (root, `docs/`, `audit-suite/` incl. law-revamp + historical, `src/physics/lawgroups/SPEC.md`) + `VERSION` + `package.json` + `bench-baseline.json`, with a TOC. The loose source docs were moved out of the codebase tree (2026-08-10); this file is the canonical documentation artifact. | regenerate only covers docs still in the tree |

The full snapshot generator is `exports/generate-full-concat.mjs`; it is intentionally invoked from the repository path rather than from `.dist/`. Large generated outputs remain review artifacts and are not runtime inputs.

**Verify the codebase snapshot runs:**
```bash
node exports/vepa-codebase-concat.mjs   # headless smoke: 500 particles, 60 ticks
```
