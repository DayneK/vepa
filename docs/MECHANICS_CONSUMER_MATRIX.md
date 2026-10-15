# Mechanics Consumer Matrix

**Snapshot refreshed:** 2026-10-15 against source at `625c82e` (VEPA4 v9.3.5 release context).

This document records where the Mechanics laws are declared, consumed, inspected, and verified. It is an architecture inventory, not a claim that each law is a complete physical model.

## Consumer matrix

| Capability | Canonical implementation | Runtime consumer | Diagnostic/inspection consumer | Test evidence | Status |
|---|---|---|---|---|---|
| Shared pair geometry | `src/physics/pairGeometry.js` → `getPairGeometry` | `src/physics/solver.js` retains equivalent local scalars in the allocation-free hot loop; not a direct helper call | `src/physics/mechanicsDiagnostics.js` | `tests/unit/mechanicsArchitecture.test.js` | Diagnostic boundary established; hot-path parity is fixture-tested |
| CONTACT correction | `src/physics/lawgroups/mechanicsLaws.js` → `applyContactCorrection`; final projection in `src/physics/contactConstraints.js` → `resolveParticleContacts` | Solver pair pass plus bounded post-integration hard-sphere projection, independently broadphased from force-neighbor budgets | `inspectMechanicsPair` uses the convenience wrapper for isolated inspection | `tests/unit/contactStructures.test.js`, `tests/unit/mechanics.test.js`, `tests/unit/mechanicsArchitecture.test.js` | Runtime-wired and gated; final projection has eight discrete iterations by default |
| COLL impact response | `src/physics/lawgroups/mechanicsLaws.js` → `applyCollisionImpulse` | Solver applies a mass-weighted normal impulse for approaching bodies; positional anti-tunnelling guard is used only when CONTACT is off | No diagnostic impulse field yet | `tests/unit/contactStructures.test.js`, mechanics/audit solver tests | Runtime-wired and gated; discrete proxy, not a fidelity guarantee |
| MOMENTUM | `mechanicsLaws.js` → `applyMomentum` | Solver mechanics pass | `inspectMechanicsPair` | Mechanics architecture tests | Runtime-wired and gated |
| WRAP | `mechanicsLaws.js` → `applyWrapBoundary` | Solver boundary pass, gated on `active[LAW_INDEXES.WRAP]` | `diagnoseWrapBoundary` (non-mutating) | `tests/unit/mechanics.test.js` | Runtime-wired and gated; the TOROIDAL EDGES world param seeds the bit |
| TORQUE | `mechanicsLaws.js` → `applyTorque` | Solver mechanics pass | `inspectMechanicsPair` | Mechanics architecture tests | Runtime-wired and gated |
| CONSTRAINT | `mechanicsLaws.js` → `applyConstraint` | Solver mechanics pass | `inspectMechanicsPair` | Mechanics architecture tests | Runtime-wired and gated |
| FRAGMENTATION | `mechanicsLaws.js` → `applyFragmentation` | Solver mechanics pass | `inspectMechanicsPair` | Mechanics architecture tests | Runtime-wired and gated |
| TOPOLOGY | `mechanicsLaws.js` → `applyTopology` | Solver mechanics pass | No dedicated diagnostic field yet | Mechanics/audit solver tests | Runtime-wired and gated |
| ADHESION | `mechanicsLaws.js` → `applyAdhesion` | Solver mechanics pass | `inspectMechanicsPair` | Mechanics architecture tests | Runtime-wired and gated |
| ACCR adjoin path | `mergePhysics.js` → `adjoinParticles` | Solver accretion/contact branch | No dedicated diagnostic path | Merge/solver tests | Runtime-wired; retains two identities |
| Bond/merge classification | `mergePhysics.js` → `isBondedPair`, `mergeParticles`, `applyAlloy` | Solver ACCR/ALLOY and bond exclusion paths | Indirectly visible through particle bond/dead fields | `tests/audit/batch_11.test.js`, merge tests | Runtime-wired |

## Boundary rules

1. `CONTACT` performs geometric separation correction.
2. `COLL` performs impact response and must not be treated as the geometry correction implementation.
3. `getPairGeometry` is the shared scalar boundary for diagnostic and future parity consumers; the solver's equivalent local hot-loop scalars are **performance-specialized** (allocation-free by design) and must stay value-equivalent to `getPairGeometry` for the same pair — verified by `tests/unit/mechanicsArchitecture.test.js`.
4. `mechanicsDiagnostics.js` is opt-in and must not mutate the particle buffer.
5. `mergePhysics.js` owns structural classification and bond hygiene; Mechanics laws do not silently mass-merge particles.
6. Mechanics consumers must use stride constants rather than duplicated offsets.

## Verification boundary

Focused tests verify selected wrapped geometry, CONTACT-versus-COLL semantics, bounded post-integration projection (including coincident centers and toroidal seams), tangential torque, non-merging adhesion, diagnostic immutability, and solver wiring. The final projection uses a radius-aware broadphase independent of force budgets and skips dead/absorbed particles; eight iterations may leave residual penetration when the world is overpacked. Browser verification exercises the actual worker shell separately and remains unverified in the current recorded environment. These tests do not establish conservation, stability for every parameter combination, continuous collision detection, or physical completeness.

## Removed capabilities

| Capability | What it was | Why it went |
|---|---|---|
| `INERTIA` (mechanics, law 130) | `mechanicsLaws.js` → `applyInertia`, mass-scaling the accumulated acceleration | It was **imported into `solver.js` and never called** — a dead toggle that duplicated `MASS_INERTIA` (86), which *is* dispatched. Removed in v9.1.29; its slot 130 became `WRAP`. `tests/unit/deadLawToggles.test.js` is the gate that stops this recurring. |

## Follow-up gaps

- Add diagnostic fields for `TOPOLOGY` and the dedicated `COLL` impulse when a stable inspection API is desired.
- Add a browser fixture that toggles Mechanics laws and checks observable worker state transitions.
- Compare exact pairwise output against approximate backends under a fixed fixture before enabling any optional backend by default.
