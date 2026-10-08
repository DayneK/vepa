# Golden-parity re-baseline log

## 2026-10-03: FIELD-ONCE on by default (D-016, AC-96)

**Change.** `runtimeConfig.fieldAdvanceOnce` now defaults to `true`. The field medium (`advanceFields`: diffusion, decay, advection) advances once per `solve()`, after the particle loop. Before this, the call sat inside the per-particle loop and ran N times per tick.

**Fixture impact.** The 12 existing scenarios run with default world params, where every `FIELD_*` value is 0 and the fields are off. Their hashes are **unchanged**. None of them exercised the field medium, which is why FIELD-ONCE went unnoticed.

To cover the change, one scenario was **added**, appended at the end so the earlier scenarios keep their seeds:

| Scenario | Legacy hash (per-particle advance, `GOLDEN_FIELD_LEGACY=1`) | New hash (D-016) |
|---|---|---|
| `default-tidal-bloom-params` | `5fd1fb81c0b138e83cb05d93d394469ea01f62f85f3e659e607784ca2d7d4ee7` | `fafed453f83a75b1666a31bfa77c55a106681bc6a9b67766cf28987a75f158ac` |

Old hashes of the unchanged scenarios, for reference: `none` 890b7a5c…, `default-tidal-bloom` 6ec06791…, `all-laws` 288ccae7…. The full list is in git history at 362fdce, `tests/fixtures/golden-parity.json`.

To reproduce the legacy hash:

    GOLDEN_FIELD_LEGACY=1 node scripts/golden-parity.mjs

**Behaviour impact.** Worlds with any `FIELD_*` parameter above 0 now evolve their medium at the intended rate. This includes the TIDAL_BLOOM boot world (FIELD_THERMAL 0.75, FIELD_INFO 0.6). Thermal and info gradients are therefore smoother and slower than before. The legacy behaviour stays available by setting `runtimeConfig.fieldAdvanceOnce = false`.

## 2026-10-09: upstream v9.2.0 WRAP law decides the world boundary (D-031 merge, D-032)

**Change (upstream, not ours).** Merging `origin/main` v9.2.0–v9.3.1 into `codey/complete-plans` brings upstream's INERTIA→WRAP rename: law 130 is now WRAP, and the solver's boundary step reads the WRAP law bit (`applyWrapBoundary(..., active[LAW_INDEXES.WRAP], ...)`) instead of the TOROIDAL EDGES world param. In the app, `syncWrapLaw` seeds the bit from TOROIDAL (default 1) at boot and on every `law:sync`. The harness passes each scenario's law list exactly, so scenarios whose list has no WRAP now run with walls (WALL REFLECT 1) instead of wrapping.

**Attribution check.** With the merged tree and only the boundary decision put back to the TOROIDAL param, all 13 scenarios reproduce the previous fixture exactly. So every hash change below comes from upstream's WRAP change. None comes from the local branch or from merge resolutions, and the harness itself is unchanged.

| Scenario | Previous hash | New hash |
|---|---|---|
| `default-tidal-bloom` | `6ec06791cec0…` | `104721a8fb53…` |
| `category-physics` | `6c5f1f56a3d0…` | `eb2640f06a41…` |
| `category-biology` | `336aa4416410…` | `e0cac94d8391…` |
| `category-quantum` | `27a5eed83946…` | `08861b63cd23…` |
| `default-tidal-bloom-params` | `fafed453f83a…` | `a0bd3b350bda…` |

The other 8 scenarios (`none`, `all-laws`, `category-mechanics`, which includes WRAP, and the five remaining categories) are unchanged. Upstream ships no golden fixture, so there were no upstream references to adopt; this re-record is the upstream behaviour change, recorded locally. Full previous list: `tests/fixtures/golden-parity.json` at `e8bce6a`.
