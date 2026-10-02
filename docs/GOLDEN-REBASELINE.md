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
