# Audit Corpus Ownership — Batch 4

**Release context:** VEPA4 9.1.3  
**Scope:** `docs/audit/laws/a3/`  
**Policy:** inventory and classify before deleting or relocating

## Current inventory

The corpus contains three per-law stage families plus roll-up documents:

| Family | Current role | Ownership status |
|---|---|---|
| `stage-1/` | Initial law-by-law audit reports | Historical evidence; producer not encoded in the files |
| `stage-2/` | Follow-up law-by-law audit reports | Historical evidence; review scope must be confirmed |
| `stage-3/` | Implementation/sign-off reports | Historical evidence; claims require executable-test corroboration |
| Roll-ups | Category summaries, progress, and ensemble reports | Derived summaries; must be compared with stage sources |

Run the read-only inventory with:

```bash
node scripts/audit-corpus-report.mjs
node scripts/audit-corpus-report.mjs --json
```

The report records file paths, byte sizes, SHA-256 hashes, family classification, and exact duplicate groups. It does not infer semantic duplication: two reports can describe the same law while differing in wording, timestamps, or claimed evidence.

## Batch 4 findings

- The active corpus contains **398 Markdown files** under the scoped audit root.
- The corpus is structurally repetitive because the same law roster appears across multiple audit stages.
- The inventory found **no byte-identical duplicate groups** in the current scoped corpus.
- Therefore, filename repetition alone is not sufficient evidence for deletion or consolidation.
- Audit prose remains supporting evidence; runtime tests and source inspection remain the authority for behavior claims.

## Ownership policy

1. Treat `src/` and executable tests as runtime and behavior authority.
2. Treat stage reports as historical audit evidence until their producer, date, and intended review scope are recorded.
3. Treat roll-ups as derived summaries, not alternate sources of truth.
4. Preserve all current records while provenance is unresolved.
5. Any future consolidation must first produce a path-level mapping from each removed record to its retained canonical record, with a reversible archive or commit boundary.

## Retention decision (D-009, 2026-10-03)

Gem decided (D-009, source human): the historical a3 reports **stay in the repository under `docs/audit`**, marked as
retained historical records in `docs/audit/provenance.json` (`status: retained-historical`, `retentionDecision`). Each
record now carries a provenance header: `stage`, `producer`, `date`, `sourceRevision` (ARP-9). The original generator is
not in this tree; the corpus entered the repository in `ac9f717` ("Initial import from gemquota/vepa", 2026-09-10), and
that is what the headers record. `npm run provenance:check` fails if any header is missing.

## Deferred decisions

- Identify the generator or manual process that produced each stage family.
- Compare roll-up claims against the generated law implementation and ontology manifests.
- ~~Decide whether historical reports belong in the main repository, a versioned archive, or release artifacts.~~ Decided: main repository (D-009).
- Add a provenance header to future audit outputs rather than retroactively rewriting historical reports.

This document authorizes classification only. It does not authorize deletion, relocation, or rewriting of the corpus.
