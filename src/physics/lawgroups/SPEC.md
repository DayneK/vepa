# VEPA4 Lawgroup Implementation Contract

> **Status:** canonical implementation contract
> **Authority:** runtime source and executable tests outrank this document
> **Scope:** `src/physics/lawgroups/*.js`

## 1. Purpose

Lawgroup modules contain category-owned, stateless simulation primitives. They describe bounded in-engine behavior; names such as gravity, quantum, consciousness, or relativity do not imply physical completeness.

## 2. Required implementation rules

1. Export named functions with stable, descriptive names.
2. Do not keep mutable simulation state at module scope.
3. Receive all runtime state through function arguments: particle views, bases, DNA/world parameters, time step, and deterministic PRNG where needed.
4. Use `STRIDE_INDEXES`, `DNA_INDEXES`, and `LAW_INDEXES` rather than magic offsets or hardcoded law numbers.
5. Return finite bounded values or explicit `null`/`false` when an effect does not apply.
6. Do not mutate the particle buffer from diagnostic or inspection helpers.
7. Keep CONTACT geometric separation distinct from COLL impact impulse.
8. Document hard dependencies, input fields, output fields, and proxy/model limitations in the corresponding generated law record or source comment.

## 3. Solver integration contract

The solver owns law gating, ordering, accumulation, integration, clamping, lifecycle transitions, and buffer mutation. A lawgroup function must not silently bypass the active law mask or mutate unrelated subsystem state.

Pairwise functions should use the shared minimum-image geometry contract. Hot-loop callers may use scalar calculations equivalent to `src/physics/pairGeometry.js` when allocation avoidance is demonstrated and covered by parity tests.

## Contact/structure correction — source checked 2026-10-15 (HEAD `625c82e`, v9.3.5 release context)

- CONTACT remains geometric; COLL remains velocity response. The pairwise pass in `solver.js` applies CONTACT correction without changing velocity. When CONTACT is off, COLL retains a positional anti-tunnelling guard and separately applies an impact impulse to approaching bodies.
- Final hard-sphere projection (`src/physics/contactConstraints.js`) runs after integration and radius updates when CONTACT/COLL/ACCR/BOND/POLYMER/ADHESION is active. Its radius-aware broadphase does not use the force-neighbor budget; it handles coincident centers deterministically, applies mass-weighted position shares, honors toroidal wrapping, and excludes dead/absorbed endpoints. Eight iterations can retain residual penetration in overpacked worlds; this is discrete, not continuous collision detection.
- POLYMER spring output is integrated, rest distance is at least combined radii, mutual links honor POLYMER_LIMIT up to six slots. BOND geometry uses symmetric radius-based angle spacing, and equilibrium correction is restricted to linked pairs.
- ADHESION closes surface gaps with normal damping and separates penetration instead of attracting through surfaces. ACCR seams are maintained against final radii; consumed/dead bodies are excluded from projection.
- Evidence: `tests/unit/contactStructures.test.js`, `tests/unit/mechanics.test.js`, `tests/unit/mechanicsArchitecture.test.js`, existing law audits and `tests/audit/params_batch_12.test.js`. These establish selected behavior/invariants, not scientific fidelity, all-parameter stability, continuous collision detection, or browser-visual acceptance.

## 4. Evidence levels

| Level | Meaning |
| --- | --- |
| Registry | Law exists in the canonical index/category map. |
| Dispatch | Solver has an active-law gate and call path. |
| Behavior | Focused executable test observes the intended bounded effect. |
| Invariant | Tests establish a stated symmetry, conservation, or non-mutation property for a defined fixture. |
| Fidelity | Numerical or scientific equivalence has been demonstrated against a named reference and tolerance. |

Registry, dispatch, and behavior evidence must not be reported as fidelity evidence.

## 5. Review checklist

- [ ] Named constants used for stride/DNA/law access.
- [ ] Finite-value and clamp behavior defined.
- [ ] Dependencies and overlap with neighboring laws recorded.
- [ ] Focused behavior tests added.
- [ ] Invariant tests added where the model claims one.
- [ ] Browser/device tests added for browser-only execution paths.
- [ ] Generated specification regenerated and checked.
