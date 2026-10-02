# .old/ — archived outdated development documents

Moved on 2026-10-02 (AEST) with `git mv` (staged locally, **not committed**). Each file keeps its original relative path under `.old/`.
Restore any file with `git mv .old/<path> <path>`.

Selection rule: a document was moved only if it is outdated (superseded by a newer document, pinned to an old version/test count, or every item in it is done or superseded) **and** nothing reads it: no build, test or CI script, no repository:check / spec:check / provenance manifest, no code import, and no link from README.md. Outdated documents that fail that rule stayed in place and are listed as "outdated-retained" in /workspace/vepa-plans/items.json.

Every planned item from these files is kept in the catalogue (/workspace/vepa-plans/index.html, items.json). Each item links back to its source document.

| Original path | Now at | Type / version | Why moved |
|---|---|---|---|
| `LAW_COMPENDIUM.md` | `.old/LAW_COMPENDIUM.md` | reference / 9.1.10  | Snapshot of VEPA 9.1.10 (records 88 files / 870 tests). Superseded by the generated, spec:check-guarded law records under docs/spec/laws/. Not referenced by any script, test or build. |
| `docs/11-26-Audit/01-consolidated-audit-dialogue.md` | `.old/docs/11-26-Audit/01-consolidated-audit-dialogue.md` | audit / 9.1.4 (2026-09-16) | Historical 9.1.4 audit-conversation reconstruction (2026-09-16). Its 12-step plan became AUDIT_REMEDIATION_PLAN.md (declared closed at 9.1.22) and its open items are carried by ARCHITECTURAL_RESOLUTION_MATRIX.md / FEATURE_STATUS_MATRIX.md. |
| `docs/11-26-Audit/02-message-answer-matrix.md` | `.old/docs/11-26-Audit/02-message-answer-matrix.md` | audit / 9.1.4 (2026-09-16) | Historical 9.1.4 message-to-answer matrix; missing-answer register superseded by ARCHITECTURAL_RESOLUTION_MATRIX.md and BACKEND_ENVELOPES.md (open items preserved in the catalogue). |
| `docs/11-26-Audit/03-full-audit-answer-set.md` | `.old/docs/11-26-Audit/03-full-audit-answer-set.md` | audit / 9.1.4 (2026-09-16) | Historical 9.1.4 answer set; "technically open" list superseded by ARCHITECTURAL_RESOLUTION_MATRIX.md (open items preserved in the catalogue). |
| `docs/11-26-Audit/04-pasted-audit-baseline.md` | `.old/docs/11-26-Audit/04-pasted-audit-baseline.md` | audit / 9.1.3 (2026-09-16) | Frozen 9.1.3 pasted audit (897 tests, commit a9f3103). Self-declares as a historical snapshot; its critical/high findings are resolved or tracked elsewhere. |
| `docs/CIVILIZATION-EXPANSION-REPORT-2026-09-30.md` | `.old/docs/CIVILIZATION-EXPANSION-REPORT-2026-09-30.md` | report / 9.1.22 (2026-09-30) | Superseded by CIVILIZATION-SEQUEL-PLAN-2026-09-30.md (its own §7 addendum says so); phases 1-6 are done or carried forward, test counts (987) are stale. |
| `docs/dev/rrp-trilogy/intent.md` | `.old/docs/dev/rrp-trilogy/intent.md` | design-spec  (2026-08-18) | E·F·A trilogy design (2026-08-18). All three sets shipped (v8.2.0-v8.4.0); modules + tests present. |
| `docs/dev/rrp-trilogy/mermaid.md` | `.old/docs/dev/rrp-trilogy/mermaid.md` | design-spec  (2026-08-18) | Diagram companion of the completed E·F·A trilogy design. |
| `docs/dev/rrp-trilogy/traceability.md` | `.old/docs/dev/rrp-trilogy/traceability.md` | design-spec  (2026-08-18) | Traceability matrix of the completed E·F·A trilogy design. |
| `docs/dev/rrp-trilogy-2/intent.md` | `.old/docs/dev/rrp-trilogy-2/intent.md` | design-spec  (2026-08-18) | D·G·H trilogy design (2026-08-18). All three sets shipped (v8.6.0-v8.8.0); modules + tests present. |
| `docs/dev/rrp-trilogy-2/mermaid.md` | `.old/docs/dev/rrp-trilogy-2/mermaid.md` | design-spec  (2026-08-18) | Diagram companion of the completed D·G·H trilogy design. |
| `docs/dev/rrp-trilogy-2/traceability.md` | `.old/docs/dev/rrp-trilogy-2/traceability.md` | design-spec  (2026-08-18) | Traceability matrix of the completed D·G·H trilogy design. |
| `docs/dev/rrp-trilogy-3/intent.md` | `.old/docs/dev/rrp-trilogy-3/intent.md` | design-spec  (2026-08-18) | I·J·K trilogy design (2026-08-18). All three sets shipped (v8.9.0-v8.11.0); modules + tests present. |
| `docs/dev/rrp-trilogy-3/mermaid.md` | `.old/docs/dev/rrp-trilogy-3/mermaid.md` | design-spec  (2026-08-18) | Diagram companion of the completed I·J·K trilogy design. |
| `docs/dev/rrp-trilogy-3/traceability.md` | `.old/docs/dev/rrp-trilogy-3/traceability.md` | design-spec  (2026-08-18) | Traceability matrix of the completed I·J·K trilogy design. |
| `docs/dev/rrp-trilogy-4/intent.md` | `.old/docs/dev/rrp-trilogy-4/intent.md` | design-spec  (2026-08-19) | L·M·N trilogy design (2026-08-19). All three sets shipped (v8.12.0-v8.14.0); modules + tests present. |
| `docs/dev/rrp-trilogy-4/mermaid.md` | `.old/docs/dev/rrp-trilogy-4/mermaid.md` | design-spec  (2026-08-19) | Diagram companion of the completed L·M·N trilogy design. |
| `docs/dev/rrp-trilogy-4/traceability.md` | `.old/docs/dev/rrp-trilogy-4/traceability.md` | design-spec  (2026-08-19) | Traceability matrix of the completed L·M·N trilogy design. |

## Inbound prose links that now point here

These are Markdown or prose mentions only. None of them is read by code, tests or the build:

- `docs/CIVILIZATION-EXPANSION-REPORT-2026-09-30.md`: mentioned in docs/CIVILIZATION-SEQUEL-PLAN-2026-09-30.md (header link)
- `docs/dev/rrp-trilogy/intent.md`: mentioned in AGENTS.md header, PLAN.md, CHANGELOG.md (prose links to docs/dev/rrp-trilogy/)
- `LAW_COMPENDIUM.md`: mentioned in CHANGELOG.md (historical entry) and the moved 11-26 audit docs
- `docs/dev/rrp-trilogy-{2,3,4}/`: mentioned in AGENTS.md and CHANGELOG.md. The retained, generated legacy records under `docs/spec/source/modules/docs/dev/` still describe them, and spec:check tolerates retained records.

## Verification after the move (Node v22.23.3)

Run on 2026-10-02 (AEST), with the 18 moves staged and not committed:

| Command | Result |
|---|---|
| `npm test` | Passed: 129 test files, 1431 tests (same as before the move) |
| `npm run repository:check` | Passed, exit 0 (spec:check, provenance, laws and the ui-module report are all up to date) |
| `VITE_BASE=/vepa/ npm run build` | Passed, exit 0 (built in about 0.6 s; systems atlas published to `dist/docs/systems`) |

No file had to be restored.
