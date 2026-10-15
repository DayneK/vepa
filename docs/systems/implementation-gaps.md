# Implementation gaps and next slices

**Review baseline:** refreshed 2026-10-15 against source at `625c82e` (VEPA4 v9.3.5 release context). `systemFoundation.js` and `systemLifecycle.js` provide shared evidence infrastructure; they do not close domain-specific ontology gaps. A registry/module, runtime wiring, bounded proxy, and roadmap acceptance are distinct evidence levels.

## Confirmed partial or missing systems

| Gap | Current proxy | What is missing | Priority |
|---|---|---|---:|
| Mating | compatibility + REPRO + lineage | explicit mate choice, courtship, pair lifecycle, rejection, mate memory | P1 |
| Family | ancestry plus bounded kin-edge and household registries in `src/state/civilization.js` | stable individual identity, durable caregiving lifecycle and representative end-to-end household/resource scenarios | P1 |
| Individual recognition | particle memory/relationship state | stable individual IDs and pair-specific history | P1 |
| Tribe/clan | bounded federation registry in `src/state/civilization.js` supports membership, links, fission and fusion | durable cross-group kin/culture continuity and full application-level acceptance | P2 partial |
| Nation | bounded polity registry in `src/state/civilization.js` supports territory, provinces, citizenship, nominated succession and institutions | durable jurisdiction/authority semantics and full application-level acceptance | P2 partial |
| Civilization | `src/state/civilization.js`: culture, kin/households, federations, polity and institutions; `src/state/continuity.js` tracks era fingerprints | End-to-end cumulative culture and multi-group continuity across member turnover in representative application scenarios; broader domain acceptance | P2 partial |
| Structure ownership | `src/state/structures.js`: bounded lifecycle-backed registry, ownership, condition and maintenance | Physical terrain/field integration, full dependency and application acceptance; `construction.js` still owns terrain effects | P2 partial |
| Cultural transmission | `src/state/civilization.js`: explicit culture records and deterministic transmission with retained/mutated/lost/invented outcomes | Long-run horizontal/vertical lineage and representative application evidence for fidelity/mutation behavior | P2 partial |
| Relationship graph | particle bond slots plus bounded kin/federation edges in `src/state/civilization.js` | general-purpose typed social-edge registry, per-edge history, and graph queries across relationship kinds | P1 |
| Reproductive architectures | REPRO lifecycle and lineage records | comparative unary/binary/multi-parent/budding/fragmentation/colony measurements and acceptance | P2 |
| Emergent boundaries | group density, roles and bounded group/federation state | validated organism boundary, corresponding merge/split evidence, and collective-fitness measures | P2 |
| Codex ontology | `src/state/continuity.js` + `src/state/codex.js`: evidence-linked regime entries with confidence and uncertainty handling | Wider observer acceptance and validation across diverse saved histories; inference remains a bounded proxy | P3 partial |

## What is already safe to claim

- Species and lineage are real runtime systems.
- Groups, economy, governance, construction, artifacts, infrastructure, memory, ecology, epochs, and synthetic state have runtime modules.
- ACCR preserves separate particle identities; ALLOY is the one-body fusion path.
- Relationship compatibility and exploration are implemented support layers.
- Shared lifecycle records, causal events, bounded emergence evidence and reports provide cross-system observations; they are not substitutes for domain-specific entity registries.
- The civilization registry now models culture, kin/households, federations and polities; structures, era continuity and codex modules add lifecycle-backed structures, observed regime fingerprints and evidence-linked entries. Focused unit and wiring tests cover these modules (`civilization.test.js`, `civilizationSequelWiring.test.js`, `structures.test.js`, `continuity.test.js`, `codex.test.js`). See `docs/CIVILIZATION-SEQUEL-PLAN-2026-09-30.md`. These checks do not make the roadmap-level systems complete.
- Regime names and observer statements are derived from measured social evidence with an explicit confidence, and are structurally prevented from being reconstructed from law state. This is `proxy`-level fidelity: it accounts for what was observed, it does not model culture or cognition.

## What must not yet be claimed as complete

- Full mating or family simulation.
- Full domain acceptance for tribe/clan, nation, or civilization, despite the presence of bounded federation/polity/civilization registries.
- Structures as *physical* objects. `structures.js` records ownership, upkeep and condition; it does not write field cells, so `construction.js` still owns terrain.
- Individual recognition and pair-specific historical memory.
- General-purpose social graph persistence.
- Open-ended evolution of institutions or relationship grammars.

## Recommended next implementation sequence

1. Specify and test a general-purpose relationship graph with stable pair keys, per-edge history, and save/restore; the existing kin/federation edges are bounded subsystem registries, not that general graph.
2. Extend kin/household behaviors with caregiving and representative application-level resource-flow evidence without changing lineage semantics.
3. Validate durable group-to-group federation edges and cultural continuity across save/restore and member turnover.
4. Connect lifecycle-backed structures to physical field/terrain effects while retaining ownership and maintenance semantics.
5. Validate multi-epoch continuity metrics and regime comparisons against diverse saved histories.
6. Build Codex explanations from evidence, never from law names alone, and validate uncertainty handling in application scenarios.
