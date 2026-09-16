# VEPA4 11-26 Audit — Full Clean Answer Set

**Prepared:** 2026-09-16
**Reference release:** VEPA4 9.1.4
**Organization:** Section 13-style remediation order
**Authority rule:** source and executable behavior outrank generated prose; generated reports must expose their provenance and limitations.

## Executive answer

VEPA4 is operational as a bounded emergent simulation with a broad law catalogue, worker/CPU execution, optional backend acceleration, lifecycle and intelligence subsystems, UI controls, persistence, benchmarks, and generated specifications. It is not evidence-backed to claim that every named phenomenon is physically complete, that every law has equal semantic depth, that approximate backends preserve all CPU behavior, or that telemetry-driven narrative agency constitutes independent cognition.

The correct remediation approach is to separate six concerns:

1. Source-of-truth and provenance.
2. Reference solver and backend parity.
3. Mechanics geometry and diagnostics.
4. Law ontology and semantic behavior.
5. Test limitations and scientific claims.
6. Repository lifecycle, exports, and historical tooling.

## 1. Source-of-truth, provenance, and repository structure

### 1.1 Current authority model

| Layer | Authority | Not authority |
|---|---|---|
| Runtime behavior | `src/` | Export snapshots |
| Behavioral verification | Executable tests and reproducible benchmarks | Audit prose alone |
| Structural specification | Generated `docs/spec/` when regenerated and checked | Stale generated copies |
| Historical evidence | `docs/audit/laws/a3/` | Current runtime claims unless corroborated |
| Release/dependency description | Manifests and current changelog | Legacy reports with stale counts |

The active audit corpus is under `docs/audit/laws/a3/`. A root `audit-suite/` directory is not present in this checkout. Stale references should be corrected in a controlled documentation pass; historical reports should not be moved merely to make the tree appear cleaner.

### 1.2 Audit corpus provenance

Create a machine-readable provenance manifest for the `stage-1/`, `stage-2/`, `stage-3/`, and roll-up families. Each record should include:

- relative path and SHA-256;
- stage/family and intended scope;
- producer or generation method;
- creation/review date;
- source revision and release context;
- status (`historical`, `derived`, `current-supporting`, or `superseded`);
- links to the source report and executable evidence.

Roll-ups remain derived summaries. No record should be removed or relocated until a mapping points to its canonical successor and a reversible archive boundary exists.

### 1.3 Export ownership and `vepa-exports`

Exports are derived handoff artifacts, not a second source tree. For every snapshot, record its producer, consumer, source revision, regeneration command, and retention state:

- **Canonical review snapshot:** one intentionally selected file per use case.
- **Generated CI artifact:** reproducible output that need not be tracked in the source repository.
- **Release artifact:** retained only when a release/handoff requires an immutable copy.
- **Historical archive:** preserved for provenance but excluded from authority.
- **Removal candidate:** only after consumer and archive proof.

A separate `vepa-exports` repository is feasible but is not completed by a local file move. It requires a repository, a reviewed publication workflow, Freebuff/GitHub App permission to write there, source revision pinning, and failure handling. The safe implementation sequence is:

1. Provision or confirm the separate repository.
2. Define whether it receives generated snapshots, release artifacts, or both.
3. Add a workflow that runs the maintained generator from a pinned source revision.
4. Publish only after `spec:check`, repository checks, and generation succeed.
5. Keep source ownership in this repository and link the external artifact back to the revision.
6. Retain a local manifest so missing remote artifacts do not silently become “latest.”

Until those prerequisites exist, the answer is “planned, not configured.”

### 1.4 Historical tooling

Retain `tests/run.mjs`, `scripts/patch-lawcat-test.mjs`, historical roll-ups, and unresolved-provenance exports as historical/recovery material. Exclude them from active CI and release authority. Removal requires consumer search, archive/provenance capture, and a reversible change boundary.

## 2. Reference solver, backends, and parity

### 2.1 Clarify the numeric contracts

- `PARTICLE_STRIDE = 100`: 100 `Float32` slots per particle.
- `MAX_PARTICLES = 100000`: application population capacity.
- Current `LAW_COUNT = 136`: law indexes `0–135`.
- Earlier 128 references: historical law boundary, not the current registry.

The stride is a memory-layout contract, not a particle count. Offset changes require coordinated updates across worker, solver, renderer, persistence, tests, and generated specifications.

### 2.2 Exact CPU terminology

The CPU pairwise solver should remain the reference backend because it is the most direct implementation of the declared VEPA numerical model and preserves the broadest law semantics. “Exact” must not mean physically exact reality. It may mean exact relative to:

- the current law equations and bounded rules;
- the current neighbor truncation and interaction cap;
- the current timestep and integration scheme;
- the current toroidal geometry;
- the current DNA/world parameter configuration.

Recommended terminology is **reference CPU solver** unless the project explicitly defines “exact” in the technical specification. If “exact CPU solver” is retained, define it with the boundary above and never use it as a claim of scientific truth.

### 2.3 Quality and performance modes

Quality mode intentionally reduces interactions or expensive cadence. Adaptive grids, pair budgets, expensive-law throttles, and renderer culling can improve responsiveness while changing emergent outcomes. Every benchmark and claim must state:

- particle count and distribution;
- active laws and world parameters;
- interaction budget and quality mode;
- solver time;
- worker round-trip time;
- main-thread analytics time;
- renderer time;
- browser/device and backend.

A full-population stress claim that reports only solver time is not a full browser performance claim.

### 2.4 Backend parity protocol

For a fixed seed and immutable initial state, compare reference CPU, Barnes–Hut, FMM, and GPU where available. Report:

- RMS absolute force error;
- RMS relative force error;
- maximum force error;
- position/velocity state error after controlled ticks;
- momentum or other declared conservation drift;
- finite-value failures and fallback count;
- wall-clock and memory cost.

Use small, medium, clustered, uniform, seam-crossing, and stress fixtures. A backend may be promoted only with an explicit tolerance envelope and an explicit default-selection policy. Speed on one fixture is not enough.

### 2.5 WebGPU

The current WebGPU boundary is an opt-in worker gravity pre-pass. CPU remains responsible for CONTACT, COLL, DNA-dependent force differences, lifecycle, fields, chemistry, information, quantum, and other unsupported semantics. On unavailable `navigator.gpu`, adapter failure, device loss, shader failure, map/readback failure, or invalid result, the worker must disable the backend and continue with CPU.

The remaining acceptance gate is a real browser/device fixture that records browser, adapter, limits, device status, seed, configuration, CPU/GPU vectors, tolerance, and fallback behavior. Node tests prove contracts and deterministic fallback; they do not prove device execution.

### 2.6 Barnes–Hut

Barnes–Hut is an approximation and must retain the reference CPU path. Add:

1. population-scale error envelopes;
2. an explicit tolerance policy by fixture class;
3. a default-selection policy visible in configuration and reports;
4. dedicated monopole/quadrupole parity tests across theta values;
5. toroidal boundary and clustered/uniform distributions;
6. regression thresholds for both error and performance.

Quadrupole correction improves the approximation but does not make it exact. FMM inherits the need for independent evidence.

### 2.7 FMM decision gate

The `cellNeighbours` placeholder cannot remain ambiguous. Choose one of three statuses:

- **Complete:** implement near/far accounting, toroidal handling, DNA limitations, and acceptance tests.
- **Experimental:** keep it opt-in, document unsupported cases, and exclude it from production-complete claims.
- **Retired:** remove active selection and preserve the historical design/provenance record.

Required tests cover direct near interactions, far expansions, no double counting, empty cells, coincident particles, seam/corner wrapping, clustered/uniform populations, and large-population error envelopes.

## 3. Mechanics and universal geometry

### 3.1 Shared geometry contract

Inventory every calculation of `dx`, `dy`, `dz`, distance, inverse distance, overlap, normal, and relative velocity in `src/physics/solver.js` and law groups. For equivalent semantics, route calculations through a zero-allocation pair-geometry contract. A specialized scalar path may remain only if:

- it is mathematically equivalent for the declared inputs;
- it has a measured performance reason;
- it has parity tests;
- it is documented as specialized.

Do not introduce per-pair object allocation in the hot loop.

### 3.2 Preserve CONTACT/COLL separation

- **CONTACT:** geometric positional penetration correction.
- **COLL:** approaching-body impact impulse and velocity response.

They must not both emit the same normal response under different names. Tests should prove no duplicate impulse, finite correction, correct mass weighting, and stable behavior for zero-distance and fast-impact cases.

### 3.3 Mechanics diagnostics

Add opt-in, side-effect-free diagnostics for:

| Law | Diagnostic |
|---|---|
| CONTACT | overlap, normal, correction vector, mass shares |
| COLL | relative normal velocity, restitution, impulse vector, impulse bound |
| INERTIA | mass, parameter scale, effective acceleration factor |
| TOPOLOGY | valid graph neighbors, bond-count imbalance, correction vector |

Add browser fixtures that toggle CONTACT, COLL, INERTIA, and TOPOLOGY independently and in combinations. A fixture must distinguish “gated off” from “no observable effect.”

## 4. Law ontology and semantic depth

### 4.1 What should be normalized

The laws do not need identical algorithms. They do need a common semantic record:

- category and registry identity;
- implementation path and solver gate;
- inputs/read fields;
- outputs/written fields;
- dependencies;
- synergies and antagonisms;
- feedback loops;
- bounds and failure guards;
- exact/approximate/proxy status;
- conservation obligations;
- executable evidence.

Prioritize lifecycle, structural, shared-state, and extreme-force laws before filling the registry alphabetically.

### 4.2 Are bounded laws a shortcoming?

No, not inherently. A bounded force, state machine, or signal transform is an expected modeling strategy in a real-time emergent simulation. It becomes a shortcoming when:

- the documentation implies literal physical fidelity;
- the transition has no declared bound or failure behavior;
- the law is not genuinely gated;
- parameters do not affect the claimed behavior;
- overlapping laws duplicate the same effect without a semantic contract;
- tests only verify source text or registry presence.

The correct answer is not to replace every proxy. It is to label and test every proxy honestly, and to replace only those proxies whose fidelity is required and whose acceptance criteria are defined.

### 4.3 Semantic tests

Replace primarily textual references with focused behavior tests:

- force direction, magnitude bounds, finite output, parameter sensitivity;
- lifecycle energy/age/dead/birth transitions;
- structural separation, impulse, bond and merge boundaries;
- information memory/signal reads, writes, and dependency gates;
- quantum/meta state transitions and bounded proxy behavior.

Every high-risk law should have a behavior test and a boundary test. Audit sign-off should name the test path and test case.

### 4.4 Conservation and non-redundancy

A universal semantic-conservation claim is not currently justified. Define conservation per subsystem and law combination:

- momentum for pairwise mechanical responses;
- energy for transfers, accretion, radiation, annihilation, and mass-energy transforms;
- field mass/quantity for field transport;
- population/lifecycle accounting where births/deaths are intentional;
- graph/bond consistency for topology and structural laws.

Run controlled matrices with one law, compatible law pairs, and representative full profiles. Separately run ablations to identify redundant or overlapping effects. Registry membership and textual relationships do not prove non-redundancy.

## 5. Ontological layers and intelligence claims

| Layer | Current evidence-backed description | Required upgrade for stronger claim |
|---|---|---|
| Layer 2 | Relationships and behavior are partially represented in law metadata, source, and tests. | Broader ontology coverage and semantic tests. |
| Layer 3 | Many named phenomena are bounded simulation proxies. | Replace selected proxies only where a defined model and acceptance test exist. |
| Layer 4 | Agency is bounded and rules/metrics-driven, with goal nudges and reversible interventions. | Persistent agent state, perception/action loop, resource constraints, autonomous goal arbitration, reproducible policy tests. |
| Layer 5 | Narrative/consciousness is telemetry-driven interpretation and bounded intervention. | Self-model, persistent learning, autonomous goal formation, unscripted action selection, and evidence separating cognition from thresholds. |
| Layer 6 | Temporal/epoch, narrative, lineage, memory, and snapshot representations are extensive but can drift or compete. | Choose a canonical temporal model; version and migrate older representations; classify alternatives as historical or derived. |

The current code should not be described as independent cognition merely because it generates narrative or changes parameters. Stronger language requires stronger architecture and evidence.

## 6. Test limitations and interpretation

The existing test system is valuable but bounded:

- Most tests run in Node, not a real browser.
- Playwright integration/device coverage complements rather than replaces unit tests.
- WebGPU device execution is not established by Node tests.
- Many audit tests prove references, gates, finite outputs, and bounded behavior—not scientific correctness.
- Conservation is not established for every law combination.
- Non-redundancy among overlapping laws is not established.
- Registry presence and dispatch do not prove all 136 laws have equally meaningful effects.
- Serial test execution stabilizes shared-state order but may conceal global-state coupling.

Required additions include browser fixtures, isolation/reset tests, conservation matrices, ablation tests, parity fixtures, and machine-readable audit sign-off manifests.

## 7. Prioritized implementation matrix

| Priority | Work | Definition of done |
|---:|---|---|
| 1 | Audit sign-off gates | Every current claim identifies implementation, gate, test/evidence, and proxy boundary. |
| 2 | Browser/device WebGPU parity | At least one capable browser/device run plus safe fallback/error lifecycle. |
| 3 | Reference/backend envelopes | Exact/reference CPU, BH, FMM, and GPU have repeatable error/timing reports. |
| 4 | FMM resolution | No active placeholder ambiguity; complete, experimental, or retired status. |
| 5 | Mechanics geometry | Equivalent calculations consolidated or justified; no semantic drift. |
| 6 | Mechanics diagnostics | CONTACT/COLL/INERTIA/TOPOLOGY observable through opt-in diagnostics and browser fixtures. |
| 7 | Law ontology | High-risk laws have relationship metadata with valid references. |
| 8 | Semantic tests | Priority laws have behavior and boundary tests. |
| 9 | Audit provenance | Stage and roll-up records have producer/scope/source mappings. |
| 10 | Export ownership | Every retained export has consumer, producer, canonical status, and retention state. |
| 11 | Historical tooling | Active CI cannot treat legacy tools as current authority. |
| 12 | Structural refactors/removals | Only after consumer mapping, parity coverage, and reversible archive boundary. |

## 8. Final decisions and unresolved answers

### Decided now

- 100 is the particle stride, not the population count.
- The current source-derived law count is 136; stale 128 claims require correction.
- `docs/audit/laws/a3/` is retained audit evidence.
- Source and executable tests outrank prose and exports.
- Exact CPU remains the reference semantics, subject to terminology clarification.
- Approximate backends remain opt-in until error envelopes justify promotion.
- Historical tools and unresolved-provenance exports remain outside authority.
- Bounded law implementations are acceptable when explicitly modeled and tested.

### Not honestly complete yet

- FMM near/far accounting and placeholder resolution.
- Browser/device WebGPU proof.
- Full backend parity and population-scale error policy.
- Universal mechanics geometry adoption.
- Comprehensive semantic tests and law relationship metadata.
- Conservation/non-redundancy evidence for all combinations.
- Complete audit corpus consumer/provenance map.
- Complete export consumer map and external `vepa-exports` publication.
- Final independent-cognition claim.
- Final decision on whether “exact” should be replaced by “reference.”

## 9. Clean completion criterion

The remediation is complete only when the repository can answer, for every significant feature or law:

1. Is it on the default runtime path?
2. Is it reference, exact-within-model, approximate, proxy, opt-in, partial, metadata-only, experimental, or historical?
3. Which source files implement it?
4. Which gate/dependency activates it?
5. Which behavior test proves it?
6. What conservation, overlap, and numerical limitations apply?
7. Which document owns the current description?
8. Which generated or historical artifacts are derived from it?

Until those answers are machine-checkable or explicitly marked as open, the correct report is “implemented with bounded claims and documented gaps,” not “fully complete.”
