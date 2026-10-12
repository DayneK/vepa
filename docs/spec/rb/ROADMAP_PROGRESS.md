# RB Roadmap Progress — 2026-10-12

**Authority:** `MASTER_SPEC.md` is a proposed architecture, subordinate to the accepted `VEPA_Roadmap_v4-5.md` decisions it cites. That accepted source file is not present in this checkout; do not infer approval for new product decisions. This tracker reports evidence in the current tree, not completion by documentation or compilation alone.

## Summary

**No RB section (00–11) is complete end-to-end.** The repository has useful groundwork and partial slices, but the proposal's acceptance gate requires observable/browser evidence, complete restart-only configuration, the selected GPU-rendered 3D direction, and modular boundaries. None can be marked complete on the present evidence. The existing Canvas2D/Pixi renderers are not the selected GPU-rendered 3D target. DOM-stub tests are not browser parity evidence.

### Completed roadmap groundwork (verified in source/docs)

- [x] Five named launch scenarios and deterministic text-to-seed retention are documented and covered by `tests/unit/roadmapLaunchFoundation.test.js`.
- [x] Particle, law, DNA and world-parameter schemas have source-of-truth modules and generated inventory/spec outputs.
- [x] Local worker/main-thread execution and existing save/undo surfaces are present; this is baseline coverage, not the proposed adapter/transaction architecture.
- [x] Laws have broad unit/audit coverage and a generated technical-spec tree. Coverage is not a claim of scientific fidelity; remaining per-law audit gaps still apply.
- [x] Shared system-roadmap catalog and lifecycle groundwork (48 variants, 47 relationships, connected topology and bounded replay artifacts) are described in `README.md`/`SPEC.md`; retain their documented scope and do not equate them with RB module extraction.

### Partial implementation (do not mark complete)

- [ ] WORLD parameter edits stage to restart; law-grid edits stage to restart; default Chaos includes laws, WORLD and active-species DNA. Ordinary DNA edits, full preset loads, selective Chaos, autonomous actions, and some compute/configuration paths still bypass global staging. Proposals are session-only and do not provide full provenance/replay transaction semantics.
- [ ] Contact, structures and solver coverage improved in working-tree v9.3.3; this does not establish dense-packing, continuous-collision, fidelity, frame-rate, or browser acceptance.
- [ ] UI overhaul, technical-spec generation and source inventory provide groundwork only; the orchestrator and several UI/solver modules remain concentrated/monolithic.

## RB sections 00–11 — completion gates

A section is checked only when its listed outcome and relevant verification evidence are complete. Subtasks are deliberately granular so work can be resumed without treating a partial slice as a completed section.

- [ ] **00 — Current program baseline:** record current mobile-first screenshots and interactions in a real browser; characterize five starter worlds, seed provenance, saves/undo and fallbacks; reconcile the source baseline to current HEAD.
- [ ] **01 — Shell and orchestrator:** extract a composition/session boundary from `src/main.js`; route commands through owned state services; characterize boot, restart, error and teardown behavior.
- [ ] **02 — Visual shell and UI:** define module ownership/read models; complete keyboard/touch/responsive behavior and real-browser parity across drawers, panels and settings; DOM stubs alone do not pass.
- [ ] **03 — World parameter system:** stage every physics-affecting setting in Easy and Advanced modes; reversible/round-tripping recipe model; coherent provenance, confirmation, undo, save and migration behavior.
- [ ] **04 — Species and genome:** stage all DNA edits and genome operations; verify all 64 traits, species creation/selection, persistence and migration without active-run mutation.
- [ ] **05 — Laws and fidelity:** make every law change restart-only across all entry points; close prioritized audit gaps with dispatch, behavior, stability and dependency evidence; no inert toggles.
- [ ] **06 — Physics and performance:** separate solver stages behind contracts; measure representative population/density/law workloads; document approximations and prove adaptation never changes simulation outcomes silently.
- [ ] **07 — Execution and cloud transport:** define provider-neutral compute contract, ordering/versioning/backpressure/recovery/security; retain local fallback. Remote execution is optional and not implemented by this proposal.
- [ ] **08 — Local rendering and visualization:** deliver roadmap-selected GPU-rendered 3D, explicit correctness-preserving capability fallback, and mobile/browser visual acceptance. Current 2D rendering does not satisfy this.
- [ ] **09 — State, presets and persistence:** unify configuration transactions, preset/world/save migration, provenance, replay and undo; ensure staged edits never leak into current-world saves.
- [ ] **10 — Emergent systems and observability:** establish stable subsystem ownership and read-only analytics projections; verify deterministic event/replay evidence and bounded user-visible actions.
- [ ] **11 — Module packages and integration:** define manifests/ports and cycle/ownership validation; isolate module tests; ship one integrated package with migration/rollback and parity gates.

## Next actionable todo lists

### P0 — Finish global configuration safety

- [ ] Inventory every UI, preset, chaos, narrative/goal, worker/backend and autonomous write path that can change physics outcomes.
- [ ] Route ordinary DNA edits, preset loads, selective Chaos and autonomous/configuration edits through the same candidate configuration/restart boundary.
- [ ] Decide and implement save/provenance/undo/replay semantics for proposed versus committed configuration; preserve launch input and derived seed.
- [ ] Add integration tests for pause, restart, worker stop ordering, undo/restore, save/load, and each configuration source.

### P1 — Establish browser baseline and acceptance

- [ ] Restore/run a real-browser test environment and verify launch → simulation → WORLD/law/DNA edit → discard/restart → save/restore flows.
- [ ] Capture mobile-first screen/interaction baselines and verify renderer, fallbacks, keyboard/touch, and responsive drawer states.
- [ ] Add a dedicated app-level test for new restart-staged control flows; existing DOM-stub coverage is not a substitute.

### P2 — Incremental architecture extraction

- [ ] Characterize APIs/events and state ownership before moving code; keep legacy facades during extraction.
- [ ] Extract pure schemas/helpers, then session/state transactions, UI read models, solver stages, and backend/render adapters in that order.
- [ ] Add per-boundary contract and migration tests; after each extraction run all repository gates and compare deterministic fixtures.

### P3 — GPU renderer / platform decisions

- [ ] Specify GPU 3D implementation and correctness-preserving fallbacks against the accepted roadmap; do not choose APIs or relax product requirements silently.
- [ ] Define mobile capability/performance matrix, visual acceptance, GPU loss/recovery behavior and metrics.
- [ ] Keep optional remote compute behind the same contract and require explicit approval for provider, data/security/cost and recovery choices.

### P4 — Release gates

- [ ] Close relevant law audits and classify each remaining approximation/known issue.
- [ ] Verify deterministic replay, numerical stability/conservation where applicable, save migrations, performance workload matrix, browser smoke and rollback.
- [ ] Update this tracker only with source/test/browser evidence; then sync release docs and version markers before an authorized release.

## Verification record

- Source baseline inspected: working tree v9.3.3, 2026-10-12; no real-browser result is available in the current handoff (prior run was blocked by missing `libglib-2.0.so.0`).
- Current production deployment before this task: `https://v5.freebuff.app/` (Freebuff status active; not evidence that v9.3.3 is deployed).
- Record actual commands, counts, browser result, commit and deployment identity here only after rerunning them for this delivery.
