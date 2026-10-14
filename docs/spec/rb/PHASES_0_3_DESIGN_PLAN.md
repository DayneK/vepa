# VEPA Phases 0–3 Design Plan

**Status:** Proposed design plan; no phase completion or implementation is implied.
**Authority:** [`VEPA_Roadmap_v4-5.md`](../../../VEPA_Roadmap_v4-5.md), §§1–8 and 12–15. Its numbered requirements and phase exit criteria remain canonical.
**Status tracking:** [`ROADMAP_PROGRESS.md`](ROADMAP_PROGRESS.md) records implementation facts and evidence; [`ROADMAP_CROSSWALK.md`](ROADMAP_CROSSWALK.md) maps product requirements to RB contracts. This document turns Phases 0–3 into sequenced design work and acceptance gates.

## Shared constraints

- Law and physics-affecting parameter changes are restart-only; no proposed subsystem may mutate a running world’s physics.
- Preserve determinism, seed/configuration/event provenance, explicit uncertainty, recovery material, and separation of simulation from rendering.
- Performance adaptation can simplify only identified visual layers, never simulation state, laws, event outcomes, or deterministic progression.
- Experiments run in separate experimental worlds/saves. Do not represent simulated emergence as evidence of real consciousness.
- Mobile-browser-first interaction is the acceptance target. Keep the required browser matrix and reference hardware explicit; other browsers are best-effort unless the product decision changes.
- Do not silently add terrestrial environment assumptions, per-world awakening thresholds, public-by-default sharing, revival, or other excluded scope.

## Phase 0 — Contracts and executable foundation

**Goal:** Make a configured world reproducible, inspectable, recoverable, and safe to extend.

### Work packages

**0.1 Canonical configuration and seed provenance**
- Define a versioned configuration schema that includes source text and derived seed, committed laws/parameters, world settings, features, preset identity/overrides, assumptions/units/boundaries, compatibility metadata, and provenance.
- Validate and normalize as a pure candidate before execution. Consequential corrections are previewed and require approval; preserve original input and report unsupported fields rather than silently reinterpreting them.
- Serialize deterministically and define migrations separately from execution. Keep UI-only preferences outside physics configuration.

**0.2 State ownership, commands, and restart transactions**
- Define the authoritative owners for particle state, DNA, laws, world parameters, RNG/tick state, emergent subsystems, persistence, and presentation-only state.
- Route physics-affecting edits through validated proposal commands and a single restart/new-world commit boundary. Make ordering explicit: stop compute, atomically commit config, rebuild state, spawn, start compute, publish success.
- Define cancel/discard, undo, save, restore, and failure semantics so proposed configuration cannot leak into the current world’s save or replay provenance.

**0.3 Persistence and recovery contract**
- Specify versioned save profiles (compact, archival, full-fidelity), atomic writes, integrity validation, checkpoints, migration, storage estimates/limits, and retention warnings.
- Recovery must preserve damaged/original material where feasible and select the latest readable validated checkpoint. Destructive cleanup requires explicit confirmation.
- Add structured diagnostics with a stable error reference and actionable recovery guidance.

**0.4 Module and law contracts**
- Define stable simulation/UI/renderer/execution ports, event/command envelopes, ownership/read-write declarations, law metadata and dependency contracts.
- Inventory current code and preserve compatibility facades during incremental extraction. Detect dependency cycles, hidden mutable state, and duplicate owners in repository checks.

**0.5 Baseline evidence**
- Capture representative seeded configurations, state/event summaries, save fixtures, mobile screenshots/interactions, and separate simulation/render/memory/storage measurements on a fixed reference device.
- Establish deterministic seed suites and test harness before refactoring or algorithm changes.

### Phase 0 exit evidence

- Configurations validate, serialize deterministically, preserve seed input and derived seed, and round-trip without loss; migration tests cover supported legacy formats and reject incompatible data without modifying the current world.
- Tests prove physics-affecting edits remain staged until restart, restart ordering is deterministic, and failed application leaves a recoverable prior state.
- Save integrity/recovery tests exercise torn writes, corruption, incomplete data, migration failure, and retention limits while preserving the latest readable state and original recovery material where feasible.
- A world can be created, run, inspected, saved, recovered, and replayed within explicitly declared compatibility limits; divergence and unsupported capabilities are reported.
- Baseline browser interactions and benchmark methodology/results are recorded; unit tests and DOM stubs do not substitute for browser evidence.

## Phase 1 — End-to-end emergence

**Goal:** Deliver a small coherent world that demonstrates required physical transitions with persistent, inspectable history.

### Work packages

**1.1 Physics sandbox and teaching**
- Keep the first-run experience in simple mode with the five named starter presets, a seed field, major controls, random-seed action, preview, and a route to advanced settings.
- Preserve arbitrary text-to-seed source and derived numeric seed. Explain likely behavior/resource costs without promising outcomes.
- Design a physics-only tutorial under two minutes. Keep future rung names hidden until reached; cryptic hints/glyphs can precede unlocked contextual help.

**1.2 Rung contracts and causal mechanics**
- For each required transition, state measurable eligibility/stability/function criteria, evidence fields, lineage/provenance, failure cases, and reproducible fixtures before implementing mechanics.
- Molecules: explicit stability/function and self-copying criteria.
- Hunting clusters: distinguish attraction/pursuit, contact, absorption, evasion, fragmentation, and escape; constrain transfer by applicable physical/energetic rules.
- Metastructures: define docking geometry, stress/failure, reproduction viability, and inspectable formation/breakup.
- Fictional awakening: one fixed global threshold; record candidate and threshold evidence, deterministic time, name/lineage, and observable follow-on action. No random spark or consciousness claim.
- Rule-based minds: observable state/decision rules; keep LLM assistance outside stable scope until Phase 7 research gates.

**1.3 Persistent event history and presentation**
- Add event definitions and evidence links for each transition, including checkpoints/replay references where supported.
- Ensure displayed cues reflect actual state. Rendering budget adaptation affects designated visual layers only and cannot simplify simulation.

### Phase 1 exit evidence

- Each required transition has a separate automated acceptance test/seed fixture; one combined runtime/FPS milestone cannot replace these checks.
- Same supported seed/configuration reproduces transition outcomes and event records within the declared compatibility contract.
- Browser smoke covers create → run → save → load → inspect/replay on the supported mobile-first browser.
- Tutorial timing and spoiler behavior are manually/browser verified; all rung labels and awakening language respect the roadmap’s fiction/uncertainty constraints.

## Phase 2 — Tribes and culture

**Goal:** Demonstrate civilization-level interaction as explicit, reproducible events with state-faithful visualization.

### Work packages

**2.1 Formation and transmission**
- Define tribe membership/identity and formation criteria from simulated state. Culture, symbols, and traditions spread through observable transmission events; avoid fixed universal symbol taxonomies.
- Keep genetic/structural inheritance separate from learned/social transmission and record the source path for each.

**2.2 Interaction event model**
- Represent formation, fighting, trade, merge, absorption, drift, and split as distinct event types with causes, actors, state changes, and evidence.
- Model supported conflict outcomes separately; never assume conflict always ends in death. Distinguish peaceful drift split from hostile schism when evidence permits.
- Preserve provenance for resource transfers, costs, compatibility, and cultural consequences.

**2.3 Visualization and observability**
- Provide a tribes toggle with estimated cost and default-on only when budget permits; keep civilization statistics available.
- Tribe tint, territory halos, and member links are independent visual layers driven by real state. Degradation is disclosed and rendering-only.

### Phase 2 exit evidence

- For each event class, targeted fixtures establish occurrence, non-occurrence when prerequisites are absent, state/history changes, and deterministic provenance.
- Visualization tests or browser evidence show overlays match actual memberships, territories, and links; disabling an overlay does not alter simulation results.
- Repeated supported seed/configuration runs remain reproducible and preserve event history through save/load.

## Phase 3 — Agents, relationships, and technology

**Goal:** Expand from group events to persistent individual and collective histories traceable to events and rules.

### Work packages

**3.1 Identity, life history, and relationships**
- Define stable entity identity and event-linked histories for notable agents, lineage, life stages, reproduction, mortality, relationships, and supported structures.
- Provide follow/navigation and family-tree projections from recorded history; on death preserve history and use an explicit configurable follow-on behavior.
- Compress ordinary activity only under a documented retention policy; retain detailed histories for notable agents.

**3.2 Technology, knowledge, and settlements**
- Model tools/resources/roles/technology only where the underlying world mechanics support them; no conventional terrestrial farming assumptions.
- Record knowledge acquisition as independent discovery, observation, teaching, trade, inheritance, or conflict transfer only when the corresponding mechanism occurred.
- Ground beliefs, myths, rituals, towns, structures, ruins, and rediscovery in explicit rules/events. Names and era summaries describe observed state rather than imply a universal progression tree.
- Keep taming deferred until foundations are stable.

**3.3 Return experience**
- Build summaries from recorded events, show text before optional clips, and provide a timeline with filters/entity links/relevant moment navigation.
- Mark inferred causal narratives and uncertain explanations as such. Link notable events to involved entities, rules, checkpoints, and replay availability when supported.

### Phase 3 exit evidence

- Integration fixtures trace selected individual and group histories to event records and applicable rules, including lineage, relationship, transmission, and technology discovery paths.
- Save/load preserves supported identity/history and reports omitted/unsupported data; history retention does not silently erase recoverable material.
- Browser smoke verifies timeline navigation, entity follow, death follow-on choices, and return summaries without changing simulation state.
- Reproducibility tests distinguish guaranteed milestone detection from best-effort anomaly detection and reject claims unsupported by recorded evidence.

## Dependency order and completion rule

Phase 0 contracts, persistence, and baselines precede Phase 1 transition acceptance. Phase 1 stable event/state contracts precede Phase 2 civilization events; Phase 2 provenance and entity identity precede Phase 3 histories and knowledge transmission. Each phase’s exit criteria are cumulative: passing a later-phase test does not waive an earlier gate. `ROADMAP_PROGRESS.md` must continue to report live source/test/browser evidence, and all roadmap phase checkboxes remain unchecked until their complete authoritative exit criteria pass.
