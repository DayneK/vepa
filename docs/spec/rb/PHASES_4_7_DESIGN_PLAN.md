# VEPA Phases 4–7 Design Plan

**Status:** Proposed design plan; no Phase 4–7 implementation or product/provider decision is implied.
**Authority:** [`VEPA_Roadmap_v4-5.md`](../../../VEPA_Roadmap_v4-5.md), especially §§4, 9, 12–15. The root roadmap remains authoritative.
**Current baseline:** VEPA4 is a browser-based Vite application with local world save/export/undo foundations. The accepted roadmap tracker records replay verification, hosted-world operations, verified community features, and research isolation as open. This plan describes the next work and gates; it does not mark any phase complete.

## Design rules across phases

1. Preserve the stable local simulation as the source of truth. Network services may store, transfer, verify, or schedule work; they must not silently change simulation laws or outcomes.
2. Keep stable, hosted, community, and experimental state separate. Experimental data cannot be loaded into or mutate a stable world without an explicit, validated import into a new world.
3. Treat exported content as untrusted input. Validate size, schema, version, integrity, resource bounds, and compatibility before allocation or execution. Never execute imported code.
4. Default to private/unlisted. Publishing, granting access, spending credits, deleting recovery material, and promoting research results require explicit user action.
5. Record provenance and uncertainty. Identify observed state, derived verification results, version/build, configuration, seed, and any declared replay limitations; never label best-effort reconstruction as verified replay.
6. Build acceptance evidence per roadmap criteria. A design, unit test, generated document, or successful deploy is not proof of replay correctness, privacy enforcement, hosted rollback, moderation readiness, or experiment isolation.

## Phase 4 — Reliable replay and sharing

**Goal:** Let users transport and compare worlds with clear compatibility and reproducibility guarantees before introducing competitive or accelerated features.

### Work packages

**4.1 Portable format and compatibility**
- Define a versioned, deterministic manifest for world exports: format/schema version, simulation/build version, seed input and derived seed, canonical committed configuration, supported law identities/versions, state profile, integrity metadata, and provenance timestamps or simulation-time markers where available.
- Reuse existing save capture/restore and export boundaries rather than inventing a parallel world representation. Separate metadata validation from large binary payload decoding; enforce configured payload and allocation limits before decoding.
- Define explicit migration functions for supported historical formats. Validate the migrated candidate before changing the active world; preserve the original export and report any lossy or unsupported transformation.
- Reject unknown required features, unsupported laws, malformed state, invalid checksums, and incompatible imports with actionable diagnostics. Do not silently clamp or reinterpret consequential data.

**4.2 Replay verification**
- Specify the deterministic replay contract by compatibility class (same build/device class, supported compatible build, and unsupported cross-version/device cases). The claim must match measured behavior.
- Record the initial committed configuration and ordered state-changing inputs/events required for replay. Add checkpoints only where justified by storage and recovery measurements.
- Build a verifier that reruns a bounded fixture and compares deterministic state/event checkpoints. Report first divergence, expected/actual build metadata, and whether the comparison is exact or uses a documented tolerance. Keep tolerant numeric comparison distinct from exact bitwise replay.
- For highlights, first retain event time and relevant state/location references; regenerate only when the matching state and renderer support it. If it cannot be regenerated, disclose that and preserve any available checkpoint/clip.

**4.3 Sharing and portable being cards**
- Add explicit export/import flows for seeds/configuration and supported world snapshots. A seed/config share is not publication of a live world.
- Portable being cards contain only fields the current simulation actually supports (identity, snapshot, lineage, traits, memories/history where present) and declare omitted fields.
- Share links/content carry build, compatibility and provenance information. The importing user sees an impact/compatibility preview before creating a separate world.
- Keep cloud storage optional at this stage; local file export must remain viable.

### Phase 4 exit evidence

- Golden fixtures replay deterministically within the declared contract; automated tests detect and report intentional injected divergence.
- Valid supported exports round-trip; malformed, oversized, corrupt, unsupported, and incompatible files are rejected without mutating the current world.
- Migration tests cover each supported prior format and prove the original input remains intact after failed migration.
- Shared artifacts display version/provenance, and privacy tests show unlisted content is not discoverable absent explicit sharing.
- Browser smoke demonstrates export, import preview, rejection, and create-as-new-world behavior on a supported browser.

## Phase 5 — Hosted worlds and sustainable operations

**Goal:** Add hosted simulation only after Phase 4 establishes reproducible configuration/state boundaries and Phase 5 operational controls are designed and tested.

### Work packages

**5.1 Architecture and threat/cost decision gate**
- First choose and document the managed identity/database/object-storage/compute/payment boundary, data residency and retention expectations, projected cost model, and provider exit strategy. No provider is selected by this plan.
- Define a provider-neutral hosted-world lifecycle interface so local simulation remains available and service outages do not corrupt local saves.
- Treat user-owned worlds and credentials as tenant-scoped. Enforce authorization on the server for every read/write; never rely on hidden UI controls for access control.

**5.2 Lifecycle, accounting and recovery**
- Model explicit states: local, queued, running, grace, paused-and-saved, resuming, failed, and deleted. State transitions are idempotent and append an auditable event.
- Present an estimate and explicit consent before launch or paid resource use. Attribute usage to world, owner, time window, and service class; expose estimate versus actual cost and a configurable hard spend limit.
- Define credit balance/expiry rules only after transparent product and legal review. If adopted, implement the accepted grace policy (1% tick rate up to 48 hours, then pause/save; top-up resumes from saved state) without deleting recovery data.
- Save checkpoints atomically, verify integrity before resume, retain prior recovery material until the new checkpoint is confirmed, and exercise operator rollback before any hosted-world launch.
- Set bounded compute/storage quotas and abuse controls. Never execute imported arbitrary code on hosted workers.

**5.3 Privacy and visitors**
- New hosted worlds are unlisted; publication is a separate, explicit transition.
- Owners control link sharing and permissions; visitors default to read-only. Authorization checks apply to API, storage, and replay/export paths.
- Document deletion, retention, diagnostics, analytics opt-out, and support access. Keep diagnostics separate from analytics and minimize collected data.

### Phase 5 exit evidence

- Integration tests cover lifecycle transitions, duplicate/retried requests, exhausted credits, outage/recovery, checkpoint corruption, permission denial, and rollback.
- Reconciliation proves accounting records match simulated usage and configured price ceilings; cost estimates are measured on representative workloads and state estimate assumptions.
- Privacy tests verify unlisted-by-default, private-by-default access, read-only visitor behavior, and owner-only mutation across service boundaries.
- Recovery drills restore the latest valid checkpoint while preserving the previous recoverable copy; rollback is demonstrated and documented before launch.
- No hosted launch until pricing, support, privacy, security, retention, and operational ownership are reviewed and approved.

## Phase 6 — Verified community features

**Goal:** Make sharing discoverable and social only when provenance, verification, privacy, and moderation can be enforced end-to-end.

### Work packages

**6.1 Gallery and fork flow**
- Start with explicit publication of a shareable immutable snapshot, not live-world access. Show owner-selected title/summary, compatibility, build, provenance, and verification status.
- Allow copy/fork into an independent world, with validated import preview. Forks preserve source attribution but never share mutable state or ownership.
- Keep ranking, challenges, and public leaderboards disabled until result verification is trustworthy; do not treat popularity as verification.

**6.2 Verification and abuse resistance**
- Define a server-verifiable result envelope binding result claims to compatible simulation build, canonical configuration, seed, and verification evidence. Clearly distinguish verified, unverified, and incompatible results.
- Prevent clients from self-asserting verified status. Re-run verification in a controlled, quota-bounded path or use another reviewed verification method before showing a verified badge.
- Rate-limit publication and verification, protect against replayed submissions and resource exhaustion, and provide a takedown/report pathway.

**6.3 Moderation and cosmetics**
- Before comments/likes, define community rules, reporting categories, moderation queue, escalation/appeal, retention, and operator response responsibility. Provide safe disabling/removal controls.
- If donations/cosmetics are introduced, cosmetics only: no simulation, storage, discovery, or competitive advantage. Keep the core simulation open.

### Phase 6 exit evidence

- End-to-end tests prove publication is opt-in, private worlds remain undiscoverable, forks are independent, and imported content is compatibility-checked.
- Verification tests reject tampered claims and preserve the unverified label when evidence is absent or incompatible.
- Moderation operations and abuse-response are staffed, documented, and exercised before enabling interactive social features.
- Ranking/challenges/leaderboards remain unavailable unless their separate replay/result-verification gate passes.

## Phase 7 — Experimental research and deferred backlog

**Goal:** Investigate speculative or costly capabilities without destabilizing stable worlds or overstating what the simulation demonstrates.

### Candidate experiment protocol

Every experiment receives a proposal before implementation with:
- A falsifiable hypothesis, target users, measurable success/failure criteria, and a stop/abandon rule.
- A separate experimental world/save format and an explicit data boundary from stable worlds.
- A cost profile (compute, storage, external service if any), reproducibility limits, privacy/data handling, failure fallback, and evaluation window.
- A written promotion/revise/abandon decision with results and limitations; experiments do not auto-promote.

### Candidate sequencing

1. **Multiplex branch-tree proof of concept:** local-only branch snapshots and deterministic comparisons, contingent on Phase 4 replay verification and measured memory/storage limits.
2. **LLM-assisted notable agents:** only after a separate provider/cost/privacy decision; strictly cap eligible notable agents, make the rule-based fallback visible, preserve identity/state across fallback, and never attribute fallback output to an LLM.
3. **Self-models and behavioral markers:** operationally defined measurements only; explicitly state they are game mechanics and are not evidence of real consciousness.
4. **Emergent language/translation, dialogue, and ambient music:** isolated research prototypes; evaluate latency, cost, quality, reproducibility, and whether users can distinguish generated interpretation from observed simulation state.

### Phase 7 exit evidence

- Automated isolation tests show experimental data, configuration, and code paths cannot mutate or load into a stable world implicitly.
- Each prototype reports repeatable metrics, uncertainty, resource cost, limitations, and the predeclared success criteria; negative results are retained.
- External model unavailability triggers a tested, clearly labeled fallback without losing state or fabricating attribution.
- Promotion requires an explicit review and separate implementation/acceptance plan; consciousness claims remain excluded.

## Cross-phase dependencies and order

1. Finish the remaining P0–P3 safety, persistence, architecture, and browser evidence gaps before claiming phase readiness.
2. Phase 4 format, migration, replay, and verification contracts precede hosted-world resume, community verification, challenges, and research branch comparisons.
3. Phase 5 security, cost, privacy, support, and rollback gates precede any public hosted-world launch.
4. Phase 6 provenance and moderation gates precede social discovery; challenges and rankings remain deferred until verification is demonstrated.
5. Phase 7 experiments remain isolated throughout and cannot be used to bypass earlier phase gates.

## Current limitations and next decisions

- No Phase 4–7 feature is asserted complete by this plan. Existing local save/export/undo APIs are foundations only, not verified replay or recovery acceptance.
- No backend, hosting, payment, identity, moderation, or LLM provider is chosen here. Phase 5 requires a documented architecture/cost/privacy decision before selecting and integrating a service.
- The supported browser matrix and reference hardware/performance budget must be stated before performance or replay claims.
- The current Playwright environment has previously failed to start Chromium due to missing `libglib-2.0.so.0`; required browser evidence remains open until run successfully in a supported managed environment.
