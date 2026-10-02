# I-complete-plans: Implement every Partial and Not started plan item in vepa

## Goal
Bring all 86 Partial (40) and Not started (46) items listed in `/workspace/vepa-plans/items.json` to Done in this local clone, so every progress bar in the vepa plans table is green. Work stays local on branch `codey/complete-plans`; nothing is pushed, published or deployed.

Each criterion below maps to exactly one item ID (in brackets). Status in the table is re-derived from the code after the verifier runs, never from the builder's claims.

## Acceptance Criteria

### B1 — Doc & stale-claim fixes
- AC-1 [AG-1]: AGENTS.md states the current VERSION, a test-file/test count equal to `vitest run` output, and an Audit Hash for the current version; it no longer claims playwright.config is missing.
- AC-2 [ARP-12]: No Markdown file outside .old/ and CHANGELOG.md links to a path that does not exist (checked by a link-check script); links in AGENTS.md/PLAN.md to files moved into .old/ point at their .old/ location; CHANGELOG.md history is untouched; no current doc states LAW_COUNT ≠ 136.
- AC-3 [DAC-1]: `grep -rn audit-suite` over AGENTS.md and GEMINI.md returns 0 matches, and each replacement path exists.
- AC-4 [CA-H7]: SPEC.md header version equals VERSION and its gate table test-file/test counts equal `vitest run` output.
- AC-5 [ESP-1]: docs/EXPORT_SNAPSHOT_POLICY.md no longer lists vepa-codebase-full-concat.md as 'retain pending review' and records its retirement.
- AC-6 [AUD-EXACT]: `grep -rni 'exact CPU'` over src/ returns 0 matches; runtimeConfig accepts gravEngine:'reference' as the canonical name for the default reference solver and 'exact' as a permanent alias that loads and behaves identically (test).
- AC-7 [LC-1]: No help/icon/tooltip entry exists for a law name absent from LAW_INDEXES; TURBULENCE_KICK/CENTRIPETAL_SCALE/ROTATION_SPEED still load from old saves and are labelled legacy.
- AC-8 [CG-3]: A duplicate-decision log exists covering every pair in docs/spec/review/duplicates.md, each with a status and source; no law is removed.
- AC-9 [FSM-SAVE]: A written save-compatibility policy exists and a test proves: v1 saves load, unknown additive fields get defaults, and a newer WORLD_SAVE_VERSION is rejected with a clear error.

### B2 — Spec generator & help correctness
- AC-10 [SPEC-HELP]: `npm run spec:generate` reports canonical LAW_HELP_DB coverage equal to the number of laws that have help (≥128/136, target 136/136), `npm run spec:check` passes, and a test fails if coverage drops to 0.
- AC-11 [CA-H8]: scripts/generate-spec.mjs contains no regex extraction of LAW_HELP_DB/LAW_PARAMETERS/LAW_HELP_PATCHES; generated docs/spec output is reproducible and `spec:check` passes.
- AC-12 [CG-1]: src/state/lawHelpPatches.js no longer exists (or exports nothing), help.js has no runtime merge loop, and every law's merged help text is unchanged (snapshot test).
- AC-13 [CG-5]: The per-particle electromagnetic polarity drift (applyFieldDrift) runs only when ELECTRIC_FIELD is on; FIELD runs only the central-field gradient; the 'ELECTRIC STORM' preset includes ELECTRIC_FIELD; tests prove each toggle alone; signoff-manifest.json carries an ELECTRIC_FIELD record with implementation evidence; FIELD/ELECTRIC_FIELD help text agrees with this.

### B3 — Small code de-duplication
- AC-14 [CA-A5]: main.js has no inline 65535 dequantize; spawned particle DNA caches are bit-identical before/after (test).
- AC-15 [CA-DUP1]: Only one accretion-pair predicate exists in src/; all physics tests pass unchanged.
- AC-16 [CA-DUP3]: Only one cipher-key derivation exists in src/; ENCRYPTION tests pass unchanged.
- AC-17 [CA-A7]: A createEngine factory exists and is used by ≥3 engines; engine public APIs and tests are unchanged.
- AC-18 [CA-A8]: Every analytics dashboard that renders intel-grid value cells uses the shared setter (setCellValue); intelPanel has no private setValue; panel DOM ids unchanged (test). dnaAnalytics, speciesPanel and narrativePanel render no intel-grid cells and are out of scope for this AC (narrowed by D-012).

### B3b — Determinism & save prerequisites (ordered first by D-011, before B4)
- AC-92 [E9]: World saves (captureWorldState/export) persist the PRNG seed and current PRNG state; restoring a save resumes the same random sequence (test: two restores of one save produce identical subsequent PRNG draws and identical simulation hashes); saves without a seed still load.
- AC-93 [LAW-PENTA]: Multiplex shard snapshot, restore and clone preserve pentaFlags (Mechanics laws 128–135); randomizeLaws sets laws ≥128 in pentaFlags and never alters laws 96–103 as a side effect (tests).
- AC-94 [DET-1]: src/physics/laws.js does not read performance.now() or Date.now() for simulation behaviour; time-dependent terms use a sim-time/tick clock; golden-parity hashes are unchanged, or any default-behaviour hash change is recorded as BLOCKED for Gem rather than re-baselined.

### B3c — Chaos Multiplex at scale (D-014, ahead of B4)
- AC-95 [MX-20]: The Chaos Multiplex is configurable (D-016): particles per sim 125–2,500 (with an equivalent % of the 100,000 default cap; 2.5% = 2,500, D-017), preview law set full or light (the light set is defined in code, documented in docs/MULTIPLEX-PERF.md and user-editable), and a sim tick rate decoupled from render (every frame, fixed ticks per second, or adaptive to keep render at 60 fps). Settings persist across reloads. Shipped presets: 'Smooth 20' (20 sims, ~125 per sim, light laws, one tick per frame), 'Balanced', and 'Full fidelity' (20 sims, 2,500 per sim, full laws, throttled ticks). Sims step in a worker pool. `npm run bench:multiplex` measures every preset and a grid of combinations headless on the box (8 vCPU, no GPU), reporting sim ms per frame, main/render-thread ms per frame and ticks per second per sim. Pass: 'Smooth 20' keeps main-thread frame time median ≤ 16.7 ms and p95 ≤ 25 ms while every sim ticks once per frame; 'Full fidelity' keeps main-thread frame time within the same 60 fps thresholds while its sims tick at a lower, reported rate. Real browser frame times are measured in Chrome when available, otherwise recorded as pending.
- AC-96 [FIELD-ONCE]: The field medium advances once per solve by default (runtimeConfig.fieldAdvanceOnce = true); the golden-parity fixture is re-baselined under D-016 with the old hashes kept in docs/GOLDEN-REBASELINE.md.
- AC-97 [HIDDEN-STATE]: Each multiplex sim has isolated solver module state (fields, history field, fate clock, solver tick); a test proves one sim's run is identical whether or not other sims or the main world step in between.

### B4 — Tests, envelopes & CI controls
- AC-19 [ARP-5]: A test asserts solver pair scalars equal getPairGeometry within 1e-9 on ≥3 fixtures, including a boundary (coincident / max-range) pair.
- AC-20 [ARP-6]: mechanicsDiagnostics returns collImpulse, inertia, topology and momentumBefore/After fields, tested on a collision fixture; simulation output is unchanged (golden check).
- AC-21 [FSM-QUAD]: A test exercises octree useQuadrupole:true and pins its measured error against direct summation at ≥2 scales.
- AC-22 [BH-ENV]: Barnes–Hut uses a population-scaled opening angle θ so that rmsRelative ≤ 0.1 at every scale 32–2048 in `bench:backends` and in tests; FMM stays opt-in experimental (never default).
- AC-23 [ARP-CC]: deploy.yml runs all five controls before build, and each command passes locally.
- AC-24 [FSM-1]: CI config runs `npm run test:e2e`; e2e suite passes locally in headless chromium and covers boot, law toggle, render frame and worker tick.
- AC-25 [MCM-2]: An e2e test toggles a Mechanics law and asserts a measurable worker-state change (e.g. contact count / velocity) versus the law off.

### B5 — Provenance & exports
- AC-26 [ARP-9]: provenance.json records stage, producer, date and source revision per stage; `npm run provenance:check` fails if a header is missing.
- AC-27 [ACO-2]: A reproducible script produces a reconciliation report listing every a3 claim that disagrees with the manifests (incl. TURBULENCE/CENTRIPETAL/ROTATION).
- AC-28 [ARP-10]: Both export snapshots are regenerated from the current tree and their headers carry producer, date and source revision; exports:check passes.
- AC-29 [ACO-3]: provenance.json marks the docs/audit/laws/a3 reports as retained historical records (kept in the repo under docs/audit), AUDIT_CORPUS_OWNERSHIP.md records that retention decision (D-009), and provenance:check passes.

### B6 — Law ontology & semantics (metadata/tests, no behaviour change)
- AC-30 [ARP-7]: ontology-coverage.json reports 136/136 laws with metadata; registry validation passes; each record cites the implementing function.
- AC-31 [LRA-3]: Every law that writes a budgeted stride field declares it; a test cross-checks declarations against fields written in code.
- AC-32 [LRA-4]: lawGraph reports cycle classes beyond hard dependencies; ≥3 runaway-scenario tests assert bounded energy/velocity over N ticks.
- AC-33 [LRA-5]: Coupling chains are declared in the ontology and a test exercises each declared chain end-to-end.
- AC-34 [LRA-6]: A contract module/test asserts the BOND→CONSTRAINT→TOPOLOGY ordering and state hand-offs on a fixture.
- AC-35 [LRA-7]: A trace export lists the information/biology coupling path and a test asserts it on a fixture.
- AC-36 [LRA-8]: A quantum state-machine module documents and tests the legal transitions of the existing quantum stride flags; golden simulation output unchanged.
- AC-37 [LRA-9]: ≥5 cross-category scenario tests run as system-level contracts and pass.
- AC-38 [LRA-10]: A dev-tools panel renders a law's relationships from lawGraph; an e2e or DOM test covers it.
- AC-39 [ARP-8]: A generated matrix lists each priority law with ≥1 behaviour and ≥1 boundary test; signoff-manifest.json covers every priority law.
- AC-40 [AUD-CONS]: Generated conservation and non-redundancy matrices cover 136/136 laws and are checked by spec:check.
- AC-41 [AUD-STC]: A contract declares writer ownership per stride field and a test fails on an undeclared write.

### B7 — Civilisation wiring of existing libraries
- AC-42 [CIV-2]: In a live run, births create kin edges and households, resource flow runs each step, state survives save/restore, and a runtime test proves it.
- AC-43 [CIV-1]: The relationship graph supports typed edges with bounded history and queries, is populated at runtime, and round-trips save/restore (test).
- AC-44 [CIV-POL]: In a live run, a qualifying federation founds a polity with territory and citizens, succession runs, and a runtime test proves it.
- AC-45 [MD-CULT]: Cultural transmission has prestige and environmental-selection terms with tests showing each biases outcomes.
- AC-46 [MD-REL]: Recorder/features/regimes modules exist, consume live relationship events and are tested.
- AC-47 [SYS-family-kinship]: At least one family-kinship domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-48 [SYS-group-tribe-clan]: At least one group-tribe-clan domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-49 [SYS-nation-polity]: At least one nation-polity domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-50 [SYS-civilization]: At least one civilization domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-51 [SYS-culture-memory]: At least one culture-memory domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-52 [SYS-relationship-laboratory]: At least one relationship-laboratory domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-53 [SYS-synthetic-society]: At least one synthetic-society domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-54 [SYS-ecology]: At least one ecology domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-55 [SYS-species-lineage]: At least one species-lineage domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.

### B8 — New civilisation systems (default-off)
- AC-56 [SYS-economy-governance]: At least one economy-governance domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-57 [SYS-infrastructure]: At least one infrastructure domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-58 [SYS-mating-reproduction]: At least one mating-reproduction domain adapter is wired into the live runtime (not only tests), its records survive save/restore, and a runtime test proves it.
- AC-59 [MD-ECON]: Ledger, market and polity-projection modules exist, conserve resources (test), are wired behind a default-off toggle.
- AC-60 [IG-MATE]: With the feature on, offspring come from chosen pairs with recorded courtship/rejection/mate memory; with it off, reproduction is unchanged (golden check).
- AC-61 [IG-REPRO]: Each listed architecture is selectable per species and recorded in a reproduction ledger (tests); default behaviour unchanged.
- AC-62 [IG-BOUND]: Boundary detection emits merge/split events and a collective-fitness metric on fixtures (tests).
- AC-63 [CIV-4b]: With the feature on, structures write field cells that change particle behaviour nearby (test); off → unchanged.
- AC-64 [CIV-6b]: With the feature on, a Codex entry measurably influences a named engine input (test); off → unchanged.

### B9 — Architecture refactors (gated by DECOMPOSITION_PLAN approval)
- AC-65 [DP-P2a]: A golden-parity script/test exists and passes; solver/ leaf modules exist; golden hash unchanged.
- AC-66 [A9]: laws.js has 0 buffer_global references and no setBuffer export; a guard test fails if a module-level buffer returns; golden hash unchanged.
- AC-67 [DP-P1]: src/physics/laws/ exists with the planned modules, laws.js is a re-export facade, no importer changes needed, golden hash unchanged.
- AC-68 [DP-P2b]: solver/backends.js owns backend selection; solver.js has no inline BH/FMM/GPU branching; golden hash and backend envelopes unchanged.
- AC-69 [DP-P2c]: solve() is composed of named phase functions (none > ~200 lines); golden hash unchanged; benchmark within 5% of baseline.
- AC-70 [DP-P4]: The three modules exist and main.js imports them; app boots in e2e; tests pass.
- AC-71 [A12]: main.js has ≤5 top-level mutable bindings; runtime state lives on a worldRuntime object; save/restore and e2e boot pass.
- AC-72 [A11]: multiplex/ has the four modules with multiplex.js as facade; multiplex tests unchanged and passing.
- AC-73 [DP-P6]: Each of the three files is split per the plan; UI DOM tests and save round-trip tests pass.
- AC-74 [DP-P7]: Both files are split per the plan; tests pass.
- AC-75 [A10]: src/render/core.js is used by both renderers; render benchmark (SwiftShader) within 5% of baseline; e2e render passes.

### B10 — External: real GPU hardware & publishing
- AC-77 [ARP-2]: A WebGPU device-parity harness (GPU-vs-CPU parity + device-lost lifecycle) and a device-report writer (adapter, limits, tolerance → bench/results/) exist and run with one documented command; done when Gem runs it on a real WebGPU device and the report is stored (pending Gem's check).
- AC-78 [RB-1]: A real-GPU renderer-benchmark run is documented with one command and refuses to label SwiftShader results as hardware; done when Gem runs it on real GPU hardware and bench/results/renderer-benchmark.json records that run (pending Gem's check).

### B11 — Feature sets Q–T (product decision)
- AC-79 [RRP-Q]: src/state/cosmology.js implements multiverse shard exchange, cosmic epochs and dark-energy expansion as specified in docs/dev/rrp-trilogy-5/intent.md Set Q, with tests.
- AC-80 [RRP-R]: src/state/entropy.js implements heat death, Big Crunch/Bounce rebirth and entropy upkeep as specified in docs/dev/rrp-trilogy-6/intent.md Set R, with tests.
- AC-81 [RRP-S]: src/state/awareness.js implements awareness arcs, meta-events and the awareness UI as specified in docs/dev/rrp-trilogy-6/intent.md Set S, with tests.
- AC-82 [RRP-T]: src/state/transcendence.js implements god-mode gestures, graduation and new-game-plus as specified in docs/dev/rrp-trilogy-6/intent.md Set T, with tests.


### Cross-cutting
- AC-87 [ALL]: After the final batch, `npm test`, `npm run repository:check` and `npm run build` all pass on Node 22, with no existing test weakened, skipped or deleted unless an ACTIVE decision authorises it.
- AC-88 [ALL]: Every refactor batch preserves simulation behaviour: the golden-parity fixture (built before Batch 3 as the first half of AC-65 [DP-P2a]) produces the same hash before and after (and, for default-off features, with the feature off), except where an ACTIVE decision authorises a behaviour change.

### Added by decision
- AC-89 [FMM-HUNT]: A time-boxed (≤1 agent-day) FMM investigation report exists at docs/FMM-INVESTIGATION.md with reproduction commands, measured rmsRelative per scale, and either a fixed, tested defect or a documented root-cause hypothesis; FMM stays experimental.
- AC-90 [CG-2]: A contract test asserts every law in LAW_INDEXES has non-empty hint, explanation and system help tiers, and either a non-empty advanced tier or an explicit intentional-exception field.
- AC-91 [SPEC-AC4]: An automated browser (Playwright) test proves the timeline dashboard renders, the REC toggle switches state and the scrub slider moves the timeline.

## Scope
- src/
- tests/
- scripts/
- bench/
- docs/ (not .old/)
- exports/
- .github/workflows/
- Root docs: AGENTS.md, README.md, SPEC.md, GUIDE.md, PLAN.md, GEMINI.md
- package.json scripts (no dependency version changes)
- B11 (RRP-Q…T) builds start only after Gem chooses from the Set Q prototype (D-003); the prototype lives on `codey/proto-set-q` and none of its code is carried over.

## Out of Scope
- Pushing, opening PRs, deploying to gh-pages/Vercel, or publishing anywhere (all irreversible; each needs its own decision).
- Version bumps, release entries and the AGENTS.md §10.4 release ritual.
- Major dependency upgrades and fixing the 5 `npm audit` advisories.
- The 47 Done and 6 Superseded items.
- Won't do (decided, with reasons): DP-P8 (optional by design, 'only if touched' — D-002); IS-1 (conditional design note, hot-path buffer with no driving need — D-002); CIV-7 (learned culture model is unspecified research — D-006); FMM-PROMO (repo decision RETAIN EXPERIMENTAL; replaced by the time-boxed hunt AC-89 — D-008); AUD-PUB (needs a new repo, secrets and pushes — D-007).
- Editing historical CHANGELOG.md entries or files under .old/ (other than .old/README.md).
- Regenerating the plans table itself; that is a reporting step done after verification.

## Proposed (unconfirmed)
- (none — P-1…P-14 were accepted or resolved by D-002…D-009)
