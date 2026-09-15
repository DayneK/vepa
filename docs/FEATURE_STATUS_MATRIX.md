# VEPA4 Feature Completion and Implementation Status Matrix

**Release context:** VEPA4 9.1.3 / legacy label 4.9.6  
**Assessment phase:** Phase 3 architecture and feature-status hardening  
**Assessment rule:** a feature is not considered complete merely because a file, export, registry entry, or unit test exists.

## 1. Status vocabulary

| Status | Meaning |
|---|---|
| **Operational** | Wired into the normal runtime path, covered by focused tests, and used by the default application flow. |
| **Operational proxy** | Runtime behavior is active and tested, but intentionally approximates the named scientific or emergent concept. |
| **Implemented, opt-in** | Runtime implementation and tests exist, but the feature is selected through a non-default backend or optional configuration. |
| **Partial / experimental** | Code exists and may be testable, but important behavior, integration, or production coverage remains incomplete. |
| **Metadata / documentation only** | Registry, help, ontology, or documentation exists without sufficient runtime evidence. |
| **Aspirational** | Mentioned or planned, but not demonstrated by current runtime wiring and tests. |

## 2. Architecture and runtime matrix

| Feature | Primary implementation | Runtime path | Evidence | Status | Remaining boundary |
|---|---|---|---|---|---|
| Browser application shell | `index.html`, `src/main.js`, Vite | Default browser entrypoint | Build smoke test and application modules | **Operational** | Browser workflow coverage should be expanded. |
| Worker physics execution | `src/worker/physics.worker.js` | Worker message protocol and shared particle buffer | Worker/unit protocol tests and build output | **Operational** | End-to-end browser stress coverage remains limited. |
| Flat particle memory | `src/state/particleBuffer.js`, `src/constants.js` | `PARTICLE_STRIDE = 100` | Buffer and physics tests | **Operational** | Reserved stride fields remain future expansion space. |
| Species DNA system | `src/dna/dnaBuffer.js`, `src/dna/expression.js` | Genome buffer plus 42-value particle cache | DNA, expression, lifecycle, and parameter tests | **Operational** | Genome-only regulatory traits require continued wiring audits. |
| Law registry | `src/constants.js` | 136 indexes across 9 categories | Category and law metadata tests | **Operational as registry** | Registry presence does not prove equal behavioral depth for every law. |
| Law-state bitmask | `src/state/lawState.js` | Four-word law mask and dependency gates | Law-state and gating tests | **Operational** | Documentation must continue to distinguish bit capacity from implemented semantics. |
| Law relationship graph | `src/state/lawOntology.js`, `src/physics/lawGraph.js` | Metadata graph and validation tooling | Graph unit tests and generated relationship records | **Implemented, opt-in** | Relationship metadata coverage is not uniform across all 136 laws. |
| Exact spatial-grid solver | `src/physics/spatialGrid.js`, `src/physics/solver.js` | Default neighbor discovery and pairwise dispatch | Physics, law-gating, and stress-oriented tests | **Operational** | Performance remains sensitive to population and active-law count. |
| Mechanics pair geometry | `src/physics/pairGeometry.js` | Shared diagnostic/orchestration geometry helper | `mechanicsArchitecture.test.js` | **Implemented, opt-in** | The entire hot solver path has not yet been migrated to one geometry object. |
| CONTACT separation | `src/physics/lawgroups/mechanicsLaws.js` | Geometric overlap correction | Mechanics architecture tests | **Operational** | Must remain distinct from impact impulse during future refactors. |
| COLL impact response | `src/physics/laws.js`, solver dispatch | Collision response in the core physics path | Physics and mechanics tests | **Operational proxy** | Conventional impulse semantics should continue to be audited against legacy behavior. |
| Mechanics diagnostics | `src/physics/mechanicsDiagnostics.js` | Explicit inspection utility, no default mutation | Non-mutation diagnostics test | **Implemented, opt-in** | Diagnostic output is not itself a physics execution pass. |
| Merge/attach/adjoin taxonomy | `src/physics/mergePhysics.js` | ACCR/ALLOY/BOND-related lifecycle paths | Merge and construction tests | **Operational proxy** | Composite structures remain particle-level approximations rather than rigid bodies. |
| Persistence and world states | `src/state/worldSave.js`, save UI | Capture, restore, compare, undo/redo | World-save tests | **Operational** | Compatibility policy for future schema changes should be formalized. |
| Intelligence engines | `src/engines/` | Cadence-driven event and metrics consumers | Engine, agency, narrative, timeline tests | **Operational proxy** | Emergent narrative meaning is bounded by available simulation telemetry. |
| Pixi/Canvas rendering | `src/render/renderer.js`, `spriteSync.js` | Main-thread visual projection | Renderer tests and production build | **Operational** | Visual correctness still benefits from browser/E2E coverage. |

## 3. Optional and experimental backend matrix

| Backend | Implementation | Default? | Evidence | Status | Completion requirement |
|---|---|---:|---|---|---|
| Exact CPU solver | `src/physics/solver.js` | Yes | Full unit/audit suite, build, law-gating tests | **Operational** | Preserve as parity reference for all accelerated paths. |
| Barnes–Hut octree gravity | `src/physics/octree.js` | No; `gravEngine = 'bh'` | Exact theta-zero comparison, bounded approximation, determinism, solver integration tests | **Implemented, opt-in** | Maintain error/performance envelope tests across population scales. |
| Quadrupole octree mode | `src/physics/octree.js` | No | Quadrupole code path exists; tests cover finite behavior indirectly | **Implemented, opt-in** | Add dedicated parity/error tests for `useQuadrupole`. |
| FMM cell builder | `src/physics/fmm.js` | No | Cell/list construction code exists | **Partial / experimental** | Complete/remove the unused `cellNeighbours` placeholder and add end-to-end parity tests. |
| FMM gravity evaluator | `src/physics/fmm.js` | No | Exported force evaluator exists | **Partial / experimental** | Validate near/far interaction accounting, toroidal edge cases, and DNA-modifier limitations. |
| WebGPU compute | `src/physics/gpuCompute.js` | No | Browser-only context creation and shader implementation | **Implemented, opt-in** | Add browser/device E2E parity tests and resource/error lifecycle checks. |
| Headless GPU-compatible fallback | `gpuComputeForcesSync` | No | Synchronous CPU implementation exists | **Implemented, opt-in** | Treat as benchmark/reference helper, not evidence of actual GPU execution. |

## 4. Law implementation evidence matrix

The registry contains 136 mapped laws. Current evidence falls into three distinct layers:

| Layer | What it proves | What it does not prove |
|---|---|---|
| Registry/index | Name, index, category, color, and help association exist | That the law has a meaningful runtime effect |
| Solver/lawgroup reference | A dispatch or implementation candidate is textually wired | That the effect is physically correct or non-redundant |
| Focused behavior test | A selected behavior is reproducible under a test fixture | That all parameter combinations and law interactions are correct |

The generated specification and law compendium should therefore use qualified language such as **implemented**, **gated**, **proxy**, **opt-in**, and **partial**, rather than treating all registry entries as equally complete.

## 5. Mechanics consolidation assessment

| Boundary | Current conclusion | Evidence |
|---|---|---|
| Pair detection vs law response | Shared geometry helper exists; full hot-path adoption is incomplete | `pairGeometry.js`, mechanics diagnostics, mechanics tests |
| CONTACT vs COLL | Conceptually separated: CONTACT performs geometric correction; COLL handles impact response | Mechanics architecture tests and current law dispatch |
| MASS_INERTIA vs DNA INERTIA | Distinct concepts are represented in metadata and implementation | Constants, solver, law records |
| BOND/CONSTRAINT | Bond topology and distance enforcement are separate utilities | `mergePhysics.js`, mechanics laws, construction tests |
| FRAGMENTATION vs collision response | Fragmentation has a separate threshold/contribution path | Mechanics tests and lawgroup implementation |
| TORQUE vs velocity response | Tangential contribution is separately exposed | Mechanics architecture test |
| ADHESION vs attraction/merging | Adhesion does not mass-merge particles | Mechanics architecture test and merge taxonomy |

## 6. Claims requiring qualification

The following claims should not be presented as fully complete without additional evidence:

1. FMM is not production-complete because the interaction architecture still includes an explicit placeholder helper and lacks full parity coverage.
2. WebGPU acceleration is not the default operational backend and has no equivalent committed browser/device test matrix.
3. Barnes–Hut is approximate by design and must retain the exact solver as its parity reference.
4. The 136-law registry is complete as a catalogue, but behavioral and relationship metadata coverage varies by law.
5. Mechanics consolidation is architecturally established but not yet a universal hot-path abstraction.
6. Audit prose can confirm intended implementation claims but cannot replace executable behavior tests.

## 7. Phase 3 acceptance criteria

- Every major feature has an explicit status and evidence source.
- Optional backends are separated from the default operational path.
- Approximation boundaries are recorded rather than implied away.
- Mechanics consolidation is described as partial where shared hot-path adoption is incomplete.
- The exact CPU solver remains the parity/reference implementation.
- Future cleanup can distinguish code removal from documentation/status correction.
