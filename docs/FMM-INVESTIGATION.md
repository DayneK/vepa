# FMM investigation (time-boxed bug hunt, 2026-10-03)

- **Decision context:** D-008 (Gem, Q7 B): one time-boxed day hunting for an FMM defect, then FMM stays experimental and FMM-PROMO is Won't do.
- **Time used:** about 1.5 agent-hours, well inside the time box.
- **Status after the hunt:** seven defects fixed. FMM is **still experimental** and still outside the 0.1 rmsRelative envelope from 128 particles up.

## Reproduce

```bash
npm run bench:backends:json                      # default 128 particles, seed 0x9e3779b9
node bench/backend-compare.mjs --count 2048      # any scale
npx vitest run tests/unit/fmmParity.test.js      # regression band, seed 0x12345678
```

`bench/backend-compare.mjs` compares against exact all-pairs minimum-image gravity (softening 0.5, G = 1, world 2000).

## Measured rmsRelative (seed 0x9e3779b9)

| N | depth | before | after fixes | Barnes–Hut (θ 0.7) |
|---|-------|--------|-------------|--------------------|
| 32 | 1 | 1.68 | **0 (exact)** | ≈0.09 |
| 128 | 2 | 1.61 | 0.27 | ≈0.07 |
| 512 | 2 | 1.15 | 0.19 | 0.076 |
| 1024 | 3 | 0.36 | 0.15 | n/m |
| 2048 | 3 | 0.20 | 0.095 | n/m |
| 4096 | 3 | 0.32 | 0.16 | n/m |

With seed 0x12345678 (the test fixture), after the fixes: 32 → 1.9e-16; 128 → 0.25; 512 → 0.30; 2048 → 0.30. Barnes–Hut on the same fixture is 0.087 / 0.074 / 0.12 / 0.33, so BH itself is outside the envelope at 2048 (the separate AC-22 population-scaled θ item).

## Defects found and fixed (`src/physics/fmm.js`)

Each fix was measured on its own in a scratch harness (`/workspace/tools/codey/fmm-hunt/`, not in the repo) by toggling it individually.

| # | Defect | Effect | Fix |
|---|--------|--------|-----|
| G | `neighStart[occupied.length]` sentinel never set | The **last occupied cell got no near-field force at all** | Set the sentinel |
| A | The 3×3×3 wrapped stencil revisits cells when grid < 3 | Near field counted the same cells 2–27× at depth 1 | De-duplicate neighbours |
| F | No coarse levels and no L2L, yet the far field only used "children of the parent's neighbours" | Every cell beyond the parent neighbourhood was **dropped**; at depth 2 the parent loop also wrapped and **double-counted** cells | Far field = every occupied cell outside the near stencil (O(cells²); honest, no longer O(N)) |
| C | Monopole M2L sign: `d` points target→source but the code subtracted it | Far-field monopole was **repulsive** (while its Hessian was attractive) | `+=` |
| E | Expansion centred on the geometric cell centre while the quadrupole is about the COM | Source position error up to half a cell | Use the COM |
| D | Quadrupole force coefficient 1.5 instead of 3 (F = −3G·Q̃d/d⁵ + 7.5G(dQ̃d)d/d⁷) | Wrong quadrupole correction | 3 |

Tests: `tests/unit/fmmParity.test.js` now checks:
- exact at 32 particles (catches A and G);
- outside the envelope from 128 up (FMM stays experimental);
- regression bounds below 0.5 at 128 / 512 / 2048 (the old values were 1.15–1.61).

## Root-cause hypothesis for the remaining error (not fixed)

1. Replacing the local Taylor expansion with a direct COM monopole per particle–cell pair halves the error (2048: 0.095 → 0.049). So the remaining error is **expansion truncation**:
   - a second-order local expansion evaluated across a whole target cell;
   - a quadrupole source with no quadrupole contribution to the Hessian;
   - separation of only one cell (the near stencil is 3×3×3).
2. Widening the near stencil to 5×5×5 does not help at depth 3. That points to the target-side Taylor step, not source separation, as the main term.
3. Reaching ≤ 0.1 would need higher-order expansions (p ≥ 4), a real hierarchical M2M/M2L/L2L tree, or evaluating the far field at particle positions. That is redesign work, not a bug fix, which matches D-008: FMM-PROMO stays Won't do.

## Not changed
- The default path (`gravEngine: 'reference'`) is untouched; golden parity is unaffected.
- DNA modifiers are still absent from the far field, as documented.
