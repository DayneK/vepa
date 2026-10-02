# Duplicate-concept decision log

Hand-maintained (not generated). It records a decision for every overlapping
concept pair named in [duplicates.md](duplicates.md) and
[../sim/concepts.md](../sim/concepts.md), plus any pair later raised in review.
**No law is removed by this log.** A pair without a human decision stays
`open: needs Gem`.

Status values: `keep-both` (the overlap is intentional and documented),
`decided` (a human decision changed behaviour), `open: needs Gem`.

| # | Pair | Indexes | What each does (checked in code) | Status | Source |
|---|------|---------|-----------------------------------|--------|--------|
| 1 | FRICTION vs DRAG | law 83 vs law 1 | FRICTION: velocity-dependent damping gated by `LAW_INDEXES.FRICTION` (`src/physics/solver.js`, about line 1435). DRAG: the broader kinetic damping law, using VISCOSITY DNA, DAMPING and FRICTION_COEFF (solver about lines 1561 and 1626). The FRICTION DNA gene feeds the DRAG path. | open: needs Gem (recorded as intentional in concepts.md, but no human decision is on file) | `docs/spec/sim/concepts.md` (generator text) |
| 2 | INERTIA (DNA 26) vs MASS_INERTIA (law 86) | DNA 26 vs law 86 | A DNA gene scaling per-particle force response vs a physics law (`applyMassInertia`, solver about line 1444) that reads the gene. These are a gene and a law, not two laws. | keep-both (not a duplicate: one is a parameter, the other a law) | `docs/spec/sim/concepts.md`; Codey review 2026-10-03, which needs Gem's confirmation |
| 3 | FIELD vs ELECTRIC_FIELD | law 87 vs law 54 | Before B2, FIELD (87) gated both the central gradient and the EM polarity drift, so ELECTRIC_FIELD (54) had no drift of its own. | decided: ELECTRIC_FIELD drives the EM polarity drift; FIELD is the central gradient only; ELECTRIC_FIELD joins the ELECTRIC STORM preset | D-005 (Gem, 2026-10-03, Q4 A), implemented as CG-5 in B2 |

The generator's own check (law indexes strictly monotonic, category membership
disjoint) found no index or category duplicates. See duplicates.md.
