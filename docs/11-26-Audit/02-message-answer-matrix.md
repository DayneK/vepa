# VEPA4 Audit Message-to-Answer Matrix

**Collection:** 11-26 Audit
**Prepared:** 2026-09-16
**Purpose:** map the conversation requests to evidence-backed answers and identify synthesized gaps

## 1. Interpretation key

| Label | Meaning |
|---|---|
| **Existing answer** | Represented by a checked-in report or source/test evidence. |
| **Reconstructed answer** | A concise consolidation of prior conclusions where the original chat wording is unavailable. |
| **Generated answer** | A new answer produced for an unresolved part of the supplied request. |
| **Open** | Requires implementation or external operational evidence; documentation alone does not close it. |

## 2. Conversation-level mapping

| Message | Topic | Answer mapped to | Evidence | Status |
|---:|---|---|---|---|
| 1 | Deep understanding, root cleanup, structure, functionality, completeness, feature matrix | Consolidated audit and feature-status method | `docs/FEATURE_STATUS_MATRIX.md`, `01-consolidated-audit-dialogue.md` | Reconstructed |
| 2 | Whether 10 items cover 30 actions/packages | Treat the 10 items as remediation workstreams, not a one-to-one inventory; each expands into sub-actions and package/file owners | `docs/AUDIT_REMEDIATION_PLAN.md` | Existing/reconstructed |
| 3 | Split 10 steps into 5×2 and report batches | Batches group related evidence and acceptance gates; completion of a batch does not imply all sub-actions are implemented | `docs/ARCHITECTURAL_RESOLUTION_MATRIX.md` | Reconstructed |
| 4 | Proceed with batch 2 | Backend evidence and verification gates | `docs/AUDIT_REMEDIATION_PLAN.md` | Reconstructed |
| 5 | Proceed with batch 3 | FMM/Barnes–Hut/backend error and ontology depth | `docs/ARCHITECTURAL_RESOLUTION_MATRIX.md` | Reconstructed |
| 6 | Proceed with batch 4 | Mechanics, audit authority, exports, historical tooling | `docs/ARCHITECTURAL_RESOLUTION_MATRIX.md` | Reconstructed |
| 7 | Split into four batches | The eight conclusions were reorganized as four paired work areas rather than four claims of completion | `docs/ARCHITECTURAL_RESOLUTION_MATRIX.md` | Reconstructed |
| 8 | Batches 3 and 4 consecutively; clarify eight unresolved conclusions | The eight-conclusion matrix is the canonical answer structure | `docs/ARCHITECTURAL_RESOLUTION_MATRIX.md` | Existing |
| 9 | Hostile three-perspective audit and normalized rating | Use separate implementation, scientific-fidelity, and governance perspectives; normalize ratings only after evidence classification | Existing audit set and feature matrix | Reconstructed |
| 10 | Assess implementation across three layers | Distinguish runtime implementation, semantic/ontology representation, and verification/documentation layer | `docs/spec/`, `docs/FEATURE_STATUS_MATRIX.md` | Reconstructed |
| 11 | 100 versus 128; audit location; WebGPU update | 100 = stride, current registry = 136, audit = `docs/audit/laws/a3/`, WebGPU = opt-in gravity bridge with CPU fallback | `docs/DEEP_AUDIT_CLARIFICATIONS.md`, source/tests | Existing |
| 12 | Actionable risk plans | Prioritized phases and acceptance criteria | `docs/AUDIT_REMEDIATION_PLAN.md` | Existing |
| 13 | Proceed with audit remediation | Start with verification gates, backend evidence, mechanics, ontology, then provenance and retention | `docs/AUDIT_REMEDIATION_PLAN.md` | Existing |
| 14 | Current five-part reorganization request | Reorder by source-of-truth, backend correctness, mechanics, ontology, test limitations, and repository lifecycle | This document and `03-full-audit-answer-set.md` | Generated |

## 3. Mapping of the supplied five items

### Item 1 — FMM, ontology, mechanics, and exports

| Supplied sub-item | Answer | Owner/evidence | Status |
|---|---|---|---|
| Remove or complete `cellNeighbours` placeholder | Replace the placeholder on the active FMM path, or retire FMM from active selection. Do not leave ambiguous behavior. | `src/physics/fmm.js`, backend benchmark | Open |
| Validate near/far accounting | Build fixtures that prove every pair is counted once, with direct near interactions and far expansion contributions separated. | `bench/backend-compare.mjs`, new FMM tests | Open |
| Validate toroidal edge cases | Include particles across each axis seam, corner wrapping, empty cells, and coincident/near-zero distances. | FMM and geometry tests | Open |
| Analyze DNA-modifier limitation | Document which force modifiers are absent from approximate paths; either implement them or scope the backend to a declared subset. | solver/backend docs | Open |
| Large-population parity/error testing | Compare deterministic fixtures at small, medium, and stress scales using force and state error envelopes. | benchmark artifacts | Open |
| Expand law ontology metadata | Add reads/writes/depends/synergy/antagonism/feedback/transform fields by risk priority, not alphabetically. | `docs/spec/laws/ontology-coverage.json` | Open |
| Add semantic tests | Assert behavior, gates, parameter sensitivity, bounds, and state transitions—not source-text references. | `tests/unit/`, audit signoff | Open |
| Mechanics hot-loop scalar calculations | Consolidate equivalent geometry or record a measured performance reason for a specialized scalar path. | `src/physics/pairGeometry.js`, solver | Open |
| COLL diagnostics | Report relative normal velocity, impulse, normal, and finite/bounded result without mutating simulation state. | mechanics diagnostics/tests | Open |
| INERTIA diagnostics | Report mass-dependent scale and verify monotonic response under controlled forces. | mechanics diagnostics/tests | Open |
| TOPOLOGY diagnostics | Report bond-count imbalance, graph-neighbor validity, and correction vector. | mechanics diagnostics/tests | Open |
| Browser Mechanics fixtures | Toggle each law in a deterministic fixture and observe a meaningful state transition. | Playwright | Open |
| Export ownership | Map consumers, release dependencies, and canonical use case before moving anything. | `docs/EXPORT_SNAPSHOT_POLICY.md` | Open |
| `vepa-exports` repository | Technically possible, but requires a separately provisioned repository, CI write permission, and a reviewed export workflow. Until then, keep local exports classified and do not pretend the remote exists. | governance/CI decision | Open/external |

### Item 2 — severity and ontological layers

| Supplied sub-item | Answer | Status |
|---|---|---|
| Highest-severity findings | Address in order: false completion claims, unverified GPU path, unbounded backend claims, FMM placeholder, mechanics duplication, weak semantic evidence, provenance ambiguity. | Phased remediation; partially implemented |
| Layer 2: missing relationship/behavior evidence | Expand ontology metadata and semantic tests for lifecycle, structural, shared-state, extreme-force, and then remaining laws. | Open |
| Layer 3: bounded proxies | Replace a proxy only where a more faithful model has a clear contract and acceptance test; otherwise retain the proxy label and its boundary. | Policy plus open implementation |
| Layer 4: autonomous agent architecture | Current agency is bounded, main-thread, goal-driven intervention through event/undo infrastructure. Upgrade only with explicit agent state, perception/action loop, resource constraints, reproducibility, and safety bounds. | Open/research |
| Layer 5: independent cognition | Current narrative/consciousness layer is telemetry-driven and bounded. Do not call it independent cognition without persistent self-model, learning, autonomous goals, and tests separating cognition from scripted thresholds. | Open; current claim must remain bounded |
| Layer 6: temporal drift and competing representations | Establish one canonical temporal/epoch representation; mark old snapshots/rollups as historical; add migration/read compatibility only where consumers require it. | Open governance task |

### Item 3 — parity, specifications, provenance, exports, CPU, Barnes–Hut

| Supplied sub-item | Answer | Status |
|---|---|---|
| Address parity failures | Define reference fixtures and compare exact CPU against each optional backend; report force/state/timing errors separately. | Open |
| Weak generated specifications | Keep generators source-derived and deterministic; add claim status, provenance, test references, and stale-path checks. | Partially addressed; open |
| Map `docs/audit/laws/a3/` provenance | Inventory stage-1/2/3 and rollups; record producer, date, input scope, source revision, and status. | Policy established; mapping open |
| Configure exports to `vepa-exports` | Requires external repo and CI setup; no safe local-only completion. Define workflow and credentials after repository provisioning. | External/open |
| Quality mode reduces interactions | Document as an explicit fidelity/performance tradeoff; never compare quality-mode timings with full-fidelity claims without labeling configuration. | Policy answer |
| Performance tuning trades fidelity | Record adaptive quality, interaction caps, cadence throttles, and grid settings in every benchmark result. | Policy answer |
| Stress claims separate solver/render time | Report solver time, worker round-trip, main-thread analytics, and renderer time as separate metrics. | Open/partially benchmarked |
| Barnes–Hut error envelopes | Add clustered/uniform/toroidal fixtures and RMS/max force error, momentum drift, finite failures, and timing. | Open |
| Barnes–Hut tolerance policy | Exact CPU is reference; each approximate backend needs a documented tolerance and cannot become default on speed alone. | Policy established |
| Barnes–Hut default selection | Default is explicit and configuration-visible; selection must be justified by fixture results. | Policy established |
| Quadrupole parity | Dedicated tests compare monopole and quadrupole outputs against exact CPU across theta and population regimes. | Open |

### Item 4 — test limitations, historical items, refactors, removals

| Supplied sub-item | Answer | Status |
|---|---|---|
| Node versus browser tests | Node tests prove deterministic contracts, not browser rendering, worker isolation, device execution, or real GPU behavior. | Confirmed limitation |
| Playwright versus unit tests | Browser tests cover integration/device/runtime surfaces and do not replace focused unit tests. | Confirmed limitation |
| WebGPU device execution | Not established by Node tests; requires capable browser/device evidence. | Open |
| Scientific correctness | Audit tests mostly prove bounded behavior and references, not universal scientific conservation. | Confirmed limitation |
| Conservation across law combinations | Must be tested per conserved quantity and explicitly scoped by law combination. | Open |
| Non-redundancy of overlapping laws | Requires ablation and interaction tests; current registry membership does not prove semantic independence. | Open |
| Meaningfulness of all 136 laws | Registry presence and dispatch do not prove equal causal significance. | Confirmed limitation |
| Serialized tests and global state | Serialization stabilizes order but can conceal coupling; add isolation/reset tests and avoid treating serial execution as proof of independence. | Confirmed limitation/open |
| Retain historical | `tests/run.mjs`, patch utility, historical rollups, unresolved-provenance exports remain outside authority. | Policy established |
| Future split/refactor | Split large modules only after dependency/consumer mapping and parity tests; candidates include constants, main, solver, laws, multiplex, and spec generator. | Planned |
| Future removal | Remove only after consumer proof, archive/provenance, and reversible boundary. | Policy established |

### Item 5 — semantic conservation, stride coupling, exactness

| Supplied sub-item | Answer | Status |
|---|---|---|
| Decouple shared stride compatibility surface | Keep the flat stride as a compatibility boundary, but move persistent domain-specific state to typed side buffers/modules where possible; introduce versioned field ownership and alignment tests before changing offsets. | Open architecture task |
| Normalize law semantic depth | Use a common ontology schema and status vocabulary, not identical algorithms. Every law should declare inputs, outputs, gates, bounds, proxy/exact status, and evidence. | Open |
| Are bounded state machines/forces/signal transforms a shortcoming? | They are expected for an emergent simulation when they are explicit model abstractions. They are a shortcoming only when presented as literal physical implementation or left untested/unbounded. | Answered by policy |
| Prove semantic conservation | Define conserved quantities per subsystem, build controlled fixtures and combination matrices, and report numerical drift. A universal claim is not valid until all supported combinations are covered. | Open |
| Universal geometry abstraction | Consolidate pair geometry where semantics are equivalent; retain specialized scalar paths only with benchmark/parity evidence. | Open |
| Keep “Exact CPU Solver”? | Keep it as the exact reference implementation of the declared VEPA numerical model. If the project intends physical exactness, remove “exact” and use “reference CPU solver” instead. | Policy decision required |

## 4. Missing-answer register

The following answers were not evidenced as completed in the checkout and are intentionally generated rather than marked complete:

1. A complete FMM near/far/toroidal/DNA parity suite.
2. A real WebGPU device run with recorded adapter and tolerance data.
3. A complete semantic test set for all high-risk laws.
4. A full provenance map for every `docs/audit/laws/a3/` record.
5. A consumer/dependency map for every export snapshot.
6. Provisioning and CI publication to a separate `vepa-exports` repository.
7. Conservation and non-redundancy matrices across all 136 laws.
8. A final decision to retain the word “exact” based on project terminology policy.

These are the correct remaining answers: they are acceptance-gated work, not gaps to be papered over by prose.
