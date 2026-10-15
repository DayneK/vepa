# RB Roadmap Progress — 2026-10-15

**Product authority:** [`VEPA_Roadmap_v4-5.md`](../../../VEPA_Roadmap_v4-5.md) at the repository root contains the accepted product decisions, numbered requirements 1–15, phased exit criteria, exclusions, and final release checklist. **RB technical translation:** [`MASTER_SPEC.md`](MASTER_SPEC.md) and RB subsystem specs 00–11 are proposed technical targets subordinate to the product roadmap. **Traceability:** [`ROADMAP_CROSSWALK.md`](ROADMAP_CROSSWALK.md) maps product sections and phases into the RB contracts. This file alone tracks implementation and evidence status. `docs/ROADMAP_V4.md` is a companion target, not a replacement authority.

**Source baseline:** current HEAD `625c82e` on `main` (tracks `origin/main`), after the P0–P3 restart-staging merge and UI concept/brief-builder merge. The v9.3.5 release tag remains at earlier commit `d24301c`. At review start the working tree was clean apart from the new `docs/review/` checklist. The merged restart-staging paths now include pending WORLD, law, DNA and species-roster batches; their presence/tests are implementation evidence, not completion of global configuration safety. Browser acceptance was attempted, but Chromium could not start because the host lacks `libglib-2.0.so.0`; no browser behavior is claimed verified.

## Navigation

- [Accepted product roadmap](../../../VEPA_Roadmap_v4-5.md) · [Phased delivery roadmap](../../../VEPA_Roadmap_v4-5.md#13-phased-delivery-roadmap) · [Final acceptance checklist](../../../VEPA_Roadmap_v4-5.md#15-final-acceptance-checklist)
- [Product-to-RB requirements and phases crosswalk](ROADMAP_CROSSWALK.md)
- [RB target architecture](MASTER_SPEC.md) · [RB specifications 00–11](00-current-program-baseline.md)
- [Current evidence and actionable work queues](ROADMAP_PROGRESS.md#next-actionable-todo-lists)

The root roadmap is canonical and is intentionally not copied into RB. Where an RB design or implementation conflicts with it, record the discrepancy and follow the roadmap’s approval process; do not silently weaken or mark its acceptance criteria complete.

## Status summary

**No RB section (00–11) or root roadmap phase is complete end-to-end on the evidence recorded here.** Five named starter scenarios and deterministic text-to-seed retention are implemented and unit-tested groundwork, not full first-run, tutorial, or progression acceptance. Existing saves/undo, law/DNA/WORLD controls, emergent systems, and lifecycle seams are partial implementation, not proof of replay, recovery, provenance, modularity, GPU-rendered 3D, hosted-world, privacy, or release acceptance. A mapped requirement, spec, generated artifact, unit test, or DOM stub is not by itself evidence of full acceptance.

### Root roadmap phases → current gate

The [crosswalk](ROADMAP_CROSSWALK.md#phased-delivery-crosswalk) gives the RB subsystem links and dependency interpretation. The phase exit criteria in the root roadmap remain authoritative.

- [ ] **Phase 0 — Contracts and executable foundation:** canonical configuration, complete restart-only staging, persistence/recovery, provenance/replay and module boundaries remain incomplete.
- [ ] **Phase 1 — End-to-end emergence:** individual rung acceptance, tutorial and selected rendering direction are not evidenced end-to-end.
- [ ] **Phase 2 — Tribes and culture:** existing systems are partial; event-class evidence and reproducibility gates remain.
- [ ] **Phase 3 — Agents, relationships and technology:** feature/history coverage and rule-linked provenance remain incomplete against roadmap criteria.
- [ ] **Phase 4 — Reliable replay and sharing:** replay verification, compatibility handling, portable provenance and recovery acceptance remain incomplete.
- [ ] **Phase 5 — Hosted worlds and sustainable operations:** hosted lifecycle, cost, privacy and operational rollback are not accepted as implemented.
- [ ] **Phase 6 — Verified community features:** gated sharing/community behavior, moderation and result verification remain deferred or unverified.
- [ ] **Phase 7 — Experimental research and deferred backlog:** experiments must remain isolated; promotion evidence, cost/reproducibility decisions and acceptance are future work.

### RB sections 00–11 → completion gates

A section is checked only when its full target and appropriate evidence pass. The Playwright RB stage matrix is not evidence until it completes successfully in a real browser. The latest attempt was blocked before browser startup by the missing host `libglib-2.0.so.0` dependency.

- [ ] **00 — Baseline:** current mobile-first screenshots/interactions, starter-world and seed provenance, saves/undo and fallback behavior.
- [ ] **01 — Shell/orchestrator:** composition/session ownership and characterized boot, restart, error and teardown behavior; current lifecycle seam is partial.
- [ ] **02 — UI:** module read models, keyboard/touch/responsive behavior and real-browser parity.
- [ ] **03 — World parameters:** all physics-affecting edits restart-staged; reversible recipes, provenance, confirmation, undo, save and migration.
- [ ] **04 — Species/genome:** all DNA edits and genome operations staged; all 64 traits, roster, persistence and migration without active-run mutation.
- [ ] **05 — Laws/fidelity:** restart-only across every entry point; prioritized dispatch, behavior, stability and dependency evidence.
- [ ] **06 — Physics/performance:** solver boundaries, representative workload measurements, documented approximations and no silent outcome changes.
- [ ] **07 — Execution/cloud:** provider-neutral compute contract, ordering/backpressure/recovery/security and local fallback; remote compute remains optional.
- [ ] **08 — Rendering:** roadmap-selected GPU-rendered 3D, explicit correctness-preserving fallback, mobile/browser visual acceptance; current 2D renderers do not satisfy this target.
- [ ] **09 — State/persistence:** unified transactions, presets/world/save migration, provenance, replay and undo; proposed edits never leak into current-world saves.
- [ ] **10 — Emergence/observability:** stable subsystem ownership, read-only projections, deterministic event/replay evidence and bounded user-visible actions.
- [ ] **11 — Packages/integration:** manifests/ports, cycle/ownership validation, isolated contract tests and integrated migration/rollback/parity gates.

## Next actionable todo lists

### P0 — Finish global configuration safety

- [x] Inventory every UI, preset, Chaos, narrative/goal, worker/backend and autonomous write path that can change physics outcomes. The merged initial inventory is recorded in `docs/spec/rb/PHASES_0_3_DESIGN_PLAN.md`; verify and extend it as paths evolve.
- [x] Ordinary DNA slider edits in DNA and species panels stage in a session-only candidate batch; per-species proposal details, discard and confirmed restart are covered by targeted controller tests. Restart commits after compute stops and before population spawn/worker initialization. This does not cover presets, roster edits, selective Chaos, autonomous paths or other direct writers.
- [ ] Route full preset loads, selective Chaos, remaining autonomous/direct configuration writes through the common restart boundary; define cross-source merge semantics. Species roster and ordinary DNA candidate batches are now staged/covered by focused tests, but that does not prove every writer uses the boundary.
- [ ] Define and implement proposed-versus-committed save, provenance, undo and replay semantics; preserve launch input and derived seed.
- [ ] Add integration coverage for pause, restart/worker ordering, undo/restore, save/load and each configuration source.

### P1 — Browser baseline and acceptance

- [ ] Run `npm run test:e2e:rb` against the managed preview when the runtime is available; the latest recorded attempt failed before page startup because Chromium could not load host library `libglib-2.0.so.0`. The merge and unit/DOM-stub coverage do not establish browser acceptance.
- [ ] Capture mobile-first screenshots/interactions and verify renderer/fallback, keyboard/touch and responsive drawer states.
- [ ] Verify the integrated launch → simulation → edit → discard/restart → save/restore flows in a real browser.
- [ ] Add app-level coverage for new restart-staged flows; DOM stubs are not a substitute for browser evidence.

### P2 — Incremental architecture extraction

- [ ] Characterize APIs/events and state ownership before moving code; retain legacy facades during extraction.
- [ ] Extract pure schemas/helpers, then state/session transactions, UI read models, solver stages and backend/render adapters.
- [ ] Add boundary contract/migration tests; run repository gates and compare deterministic fixtures after each extraction.

### P3 — GPU renderer / platform decisions

- [ ] Specify GPU 3D implementation and correctness-preserving fallbacks against the accepted roadmap; do not silently choose APIs or relax requirements.
- [ ] Define mobile capability/performance matrix, visual acceptance, GPU loss/recovery behavior and metrics.
- [ ] Keep optional remote compute behind the same contract; provider, data/security/cost and recovery choices need explicit approval.

### P4 — Release gates

- [ ] Close relevant law audits and classify remaining approximations/known issues.
- [ ] Verify deterministic replay, numerical stability/conservation where applicable, save migrations, performance matrix, browser smoke and rollback.
- [ ] Update this tracker only with source/test/browser evidence; sync release docs and version markers before any separately authorized release.

## Evidence notes

- Historical v9.3.4 verification record: the previous tracker recorded focused and full Vitest, syntax, repository/spec and build checks as passing for that release, plus a Playwright attempt that stopped before page startup due to the host Chromium dependency `libglib-2.0.so.0`. These historical results do not verify the present worktree or browser behavior.
- Current source baseline checked 2026-10-15: HEAD `625c82e`; merged P0–P3 transaction changes and UI concept/brief-builder assets are in the tree. The browser blocker above remains the latest recorded attempt. Do not check phases or RB sections from merged code alone.
- Current browser status: unverified. `npm run test:e2e:rb` attempted all 12 cases, but each failed before page startup because Chromium could not load `libglib-2.0.so.0`; this is an environment blocker, not a passing browser check.
- Do not mark any checkbox above or in the root roadmap based solely on this documentation integration.
