# VEPA4 — UI Overhaul Plan

**Status:** approved in principle; phases executed in order (see §3).
**Scope decision:** *Everything + refactors.* No tab is left as-is if the review found a defect in it.
**Companion:** `docs/systems/ui-module-report.md` (generated — never hand-edit) is the evidence base.
Every claim below that says a thing is broken cites a file and line; nothing here is inferred from
naming alone.

---

## 1. What the review found (evidence)

| # | Finding | Evidence |
|---|---------|----------|
| 1 | `INERTIA` (mechanics, law 130) is a **dead toggle** | imported at `src/physics/solver.js:121`, zero call sites; gate count for `active[LAW_INDEXES.INERTIA]` = 0 while all 7 sibling mechanics have ≥ 1. It also duplicates `MASS_INERTIA` (86), which *is* dispatched (`solver.js:1444-1447`). |
| 2 | LAWS help text is stale | `src/ui/helpRegistry.js:138` names the slate band "Elasticity, turbulence, centripetal force and rotation"; the real band is CONTACT 128, MOMENTUM 129, INERTIA 130, TORQUE 131, CONSTRAINT 132, FRAGMENTATION 133, TOPOLOGY 134, ADHESION 135. `LAW_COUNT` is **136** (`src/constants/laws.js:34`), not 128. |
| 3 | A `WRAP` law existed and was retired into a world param | `src/physics/solver.js:1676-1678` (verbatim comment): *"the WRAP law was retired into WORLD → SIMULATION RULES"*; body at ~1681 branches on `WP.TOROIDAL` with `WP.WALL_REFLECT` as the soft-wall path. |
| 4 | PRESETS is documented but renders nothing | `createPresetPanel` mounts into `#world-panel` (`src/ui/presetPanel.js:66`, `if (!panel) return;`). No such id exists in `index.html`. Consequence: `preset:refresh` / `preset:stateResponse` never arrive; `preset:saved` / `preset:deleted` / `preset:requestState` reach nothing. `src/state/presetManager.js` is unreachable. **Boot presets are unaffected** — they come from `src/state/launchSettings.js` → `presetFor()`. |
| 5 | Two owners for backend + engine | `renderBackend` and `computeEngine` are both launch-modal fields (`LAUNCH_FIELDS`) *and* SETTINGS controls (`src/ui/settingsPanel.js`), with no stated precedence. |
| 6 | `narrative:batch` has no emitter | `src/ui/narrativePanel.js:110` listens; nothing sends it. The only performance lever on a long run. |
| 7 | `group:declare` has no producer | `src/main.js:1098` subscribes; nothing emits. The "declared by the player" path GROUPS help advertises cannot happen. |
| 8 | GROUPS tooltip is self-admittedly misleading | `src/ui/helpRegistry.js:100` — *"titled 'Civilizations (Set F)' … which is misleading"*. |
| 9 | `src/ui/dnaPanel.js` (184 lines) is unreachable | a complete grouped 64-slider editor (Motion / Matter / EM / Biology / Communication / Genetics) that nothing mounts, while SPECIES shows 3 sliders + `#dna-accordion`. |
| 10 | `drawAll` never executed by tests | `src/ui/ecoPanel.js`, `src/ui/groupAnalytics.js`, `src/ui/civilizationPanel.js`. Same class of defect shipped a `ReferenceError` in `civilizationPanel` for a full release. **Blocker for editing CIVILIZATION.** |
| 11 | DNA ANALYTICS expansion is bound to double-click | `src/ui/dnaAnalytics.js` (548 lines) — a desktop gesture in a touch-first drawer. Button label "DNA" vs title "DNA ANALYTICS" mismatch. |
| 12 | `#laws-panel` lives inside SETTINGS | `index.html:160`. `lawPanel.js` *appends* its 136-tile category grid to it after `settingsPanel` has rendered. Two owners of one container — the entanglement that let the preset panel target a container that no longer exists. |

---

## 2. Updated review, per sub-tab (in light of the answers)

### SETUP → LAWS
- **Law count / band text** — correct the help string to 136 laws and the real slate band (finding 2).
- **Search / filter box** *(answer: yes)* — a text input over `LAW_INDEXES` keys + help hints, filtering tiles by substring; combined with the existing `cat-tab` category row so search **and** category compose (search narrows, a category hides).
- **Per-category all on / off** *(answer: yes)* — a small ON / OFF pair on each category header row, driven through the same `law:toggled` emit the tiles use, so `worldPanel` and `lawPanel` stay in step via `law:sync`.
- **Category headers with active counts** — `PHYSICS 7/16` style, so the grid answers "what is on?" without counting lit tiles.
- **No-dead-toggle audit test** — every `LAW_INDEXES.X` must appear in a solver gate or on an explicit allow-list. This is the test that would have caught finding 1 on day one.
- **Preset-origin dot** — tiles whose state came from a preset get a marker, so "why is this on?" has an answer.
- **WRAP** arrives in Phase 1.

### SETUP → WORLD
- **Revive presets here** *(answer: revive inside WORLD)* — mount the preset panel in a real `#world-panel` that WORLD owns, not SETTINGS. `src/state/presetManager.js` stops being dead code.
- **TOROIDAL + WALL REFLECT** grouped under a "BOUNDARIES" heading that names the WRAP law as their law-level switch.
- **Split the 553-line panel** into three sections — parameters / law grid / presets — instead of one module doing three jobs.
- **Per-section reset-to-preset.**

### SETUP → SPECIES
- **Adopt `dnaPanel.js`'s grouping** rather than leaving it unreachable — the six groups (Motion / Matter / Electromagnetism / Biology / Communication / Genetics) become the accordion's sections.
- **Expose the 22 genome-only regulatory traits** (DNA 42-63), which are currently invisible in the UI.
- **Per-species diff vs preset baseline**, **clone/reseed**, and the metastability warning surfaced in-UI instead of only in help text.

### SETUP → SETTINGS
- **Single source of truth for backend + engine** *(finding 5)* — the launch modal sets the *initial* value; SETTINGS overrides live; a "use as launch default" button writes SETTINGS back into `launchSettings`.
- **Inline "requires reload" badges** — the only honest way to show that a compute backend change is not instant.
- **Per-section reset**, **export/import**.
- **Resolve the `#laws-panel` ownership** (finding 12): the container moves to LAWS, SETTINGS stops co-owning it.

### WORLD STATES (SAVES)
- **Three sub-tabs** *(answer: three)* —
  1. **WORLD STATES** — list, compare, load, delete, per-entry size / tick / timestamp and a diff preview.
  2. **UNDO** — history plus `canUndo`/`canRedo`, lifted out of `main.js` into the panel that shows it.
  3. **IMPORT / EXPORT** — file pick and download, currently interleaved with the list.

### DATA → INTELLIGENCE
- "Since last snapshot" deltas, fold SNAPSHOTS + RECORDING into one view, jump-to-restore that hands off to SAVES.

### DATA → DNA ANALYTICS
- **Explicit EXPAND / CLOSE + pin** replacing double-click *(finding 11)*, per-species legend with visibility toggles, split into graphs / trait table / history modules, align the button label with the panel title.

### DATA → LOGS
- **Filter chips by category**, pause-autoscroll, per-category counts, and **`narrative:batch` actually emitted** as a throttled flush *(finding 6)* — the only lever that keeps a long run's log panel from becoming the bottleneck.

### DATA → GROUPS
- Fix the tooltip title *(finding 8)*; group selection + detail row (leader, treasury trend, alliances, artifacts); either wire `group:declare` to a real button or drop the claim from help *(finding 7)*.

### DATA → ECOSYSTEM
- **Species leaderboard** *(answer: leaderboard in ECO)* — top N by population with sparkline; extinction list with tick and recovery-threshold status; a one-line "who eats whom" read from `PREDATION_BIAS`.

### DATA → CIVILIZATION
- **CODEX promoted** *(answer: promoted in CIV)* to a full-width block with a "last changed" stamp; band cells CULTURE / POWER / READING.
- **Gated on finding 10** — the `drawAll` test gap closes before a single line of this panel changes.

### Shared selection context
*(answer: yes — shared context)* — one selected species or group, owned by a small module, honoured by INTELLIGENCE, DNA ANALYTICS, ECO and CIVILIZATION. Selecting in one panel filters the rest instead of making the reader cross-reference four read-only grids by eye.

---

## 3. Phases (executed in order)

Each phase is self-contained: it ends with the full 10-gate set green and a version bump.

| Phase | Contents | Why here |
|-------|----------|----------|
| **0 — Audit infrastructure** | No-dead-toggle law test; `drawAll` coverage for eco / group / civilization; LAWS help text correction; GROUPS tooltip title. | The tests that catch the next dead toggle and the next `ReferenceError` must exist *before* the code they guard changes. Cheap, and it makes every later phase verifiable. |
| **1 — Mechanics swap** | Delete `INERTIA`: `applyInertia` + `diagnoseInertia`, `MECHANICS_HELP.INERTIA`, `MECHANICS_PARAMETERS.INERTIA`, `LAW_DEPENDENCIES[130]`, `MECHANICS_ICONS.INERTIA`, the ontology records, and the solver import. Add **WRAP at 130**: a stateless `applyWrapBoundary` in `mechanicsLaws.js` holding the wrap-vs-soft-wall body, gated by `active[LAW_INDEXES.WRAP]` in the solver; `WP.TOROIDAL` stays as the *default* that seeds the bit at world load; 4-tier help + dependencies + icon. | A mechanic swap is the one change here that alters the simulation, so it gets its own phase and its own tests rather than riding along inside a UI phase. |
| **2 — Shared selection context** | New selection module + `selection:changed` on the bus; adopted by INTELLIGENCE / DNA ANALYTICS / ECO / CIVILIZATION. | Every later data-panel phase builds on it; landing it second means the drill-down work in Phase 4 has one mechanism to plug into instead of three. |
| **3 — SAVES + presets** | SAVES three sub-tabs; preset panel revived inside WORLD; `#laws-panel` ownership resolved; WORLD split into parameters / law grid / presets. | Structural, and it unblocks the SETTINGS precedence work in Phase 6 (which currently depends on knowing who owns which container). |
| **4 — Data panels** | Drill-down on the shared selection; ECO leaderboard; LOGS filter chips + `narrative:batch` flush; CODEX promotion; DNA ANALYTICS expand/pin + legend; GROUPS selection detail and the `group:declare` decision. | Depends on Phase 2 for selection and Phase 0 for the `drawAll` safety net. |
| **5 — LAWS grid** | Search / filter box; per-category all on / off; active counts; preset-origin dot. | Pure grid work, no data dependency — sequenced last among the UI phases because it is the easiest to verify in isolation and the easiest to regress silently. |
| **6 — SETTINGS precedence + docs** | Backend/engine single owner, reload badges, per-section reset, export/import; then the documentation sync across `CHANGELOG.md`, `SPEC.md`, `PLAN.md`, `GUIDE.md`, `audit-suite/`, `docs/spec/`. | Closes the plan with the cross-cutting concern and the ledger, so one release covers the whole overhaul. |

**Release:** one version for the whole plan (minor bump from 9.1.28 — the change set is large and lands together).

---

## 4. Verification, per phase

The 10 gates, unchanged:

```
npm run syntax-check · npm run test · npm run spec:generate · npm run spec:check
npm run repository:check · node scripts/validate-provenance.mjs
node scripts/validate-signoff.mjs · node scripts/check-export-publication.mjs
node scripts/audit-corpus-report.mjs · npm run build
```

Any source change makes `docs/spec/` stale, so `spec:generate` runs **after** the version bump and
before `spec:check` / `repository:check`.

**Standing limitation, stated honestly in the changelog:** there is no real-browser verification in this
environment (Chromium cannot launch, vitest runs `environment: 'node'`, no DOM library). UI work is
covered by the `tests/helpers/domStub.js` harness and by structural assertions on markup — not by
clicking anything.

**Standing blind spot that Phase 0 closes:** `ecoPanel.drawAll` and `groupAnalytics.drawAll` have never
been executed by a test. A `ReferenceError` of exactly that shape shipped in `civilizationPanel` for a
full release.

---

## 5. Decisions taken, with reasons

| Decision | Reason |
|----------|--------|
| WRAP gates the *existing* toroidal body rather than adding a new one | The physics is already correct and already documented as having been a law. The defect was that it became a world param and lost its toggle. Re-adding the toggle restores the intent without touching the simulation's behaviour. |
| `WP.TOROIDAL` remains, as the default | The world param is how a saved world records its boundary mode. The law bit is the live switch; the param is the initial value. Collapsing them would break world saves. |
| `dnaPanel.js` is adopted, not deleted | It is a finished grouped editor. Deleting it would remove the SPECIES grouping the review asks for; adopting it costs one import. |
| Phase 0 exists at all | Findings 1, 6, 7 and 10 are all *the same defect class* — a toggle or a code path that nothing exercises. Fixing instances without fixing the class just moves the bug to the next release. |
