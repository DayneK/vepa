# Backend Error and Performance Envelopes

**Project:** VEPA4 9.1.22
**Benchmark:** `npm run bench:backends` (`bench/backend-compare.mjs`)
**Fixture:** deterministic SplitMix-style gravity kernel, world size `WORLD_SIZE`,
softening `0.5`, seeds `0x9e3779b9` (CLI) and `0x12345678` (tests).
**Status:** repeatable envelope evidence — gravity kernel only

## 1. Scope and promotion rules

This is a **gravity-kernel comparison fixture**, not full-solver parity. DNA
modifiers, collision, lifecycle, GPU device execution, and full solver
scheduling are outside this comparison (restated by the benchmark's own
`interpretation` field).

Promotion rules (remediation plan §4.3):

1. The **exact CPU direct sum remains the parity reference** for every
   approximate backend.
2. An approximate backend must carry an **explicit tolerance envelope**:
   `rmsRelative ≤ 0.1` and `maxAbsolute ≤ 1.0` on the standard fixtures
   (reporting policy, not a scientific-equivalence claim).
3. **A backend cannot become the default solely because it is faster** on one
   fixture. Envelope status, not wall-clock time, gates promotion.
4. Every measurement below is reproducible with
   `node bench/backend-compare.mjs --count <n>`.

## 2. Measured envelope — CLI seed `0x9e3779b9`

| Count | Backend | rmsRelative | maxAbsolute | within envelope | ms (approx) |
|------:|---------|------------:|------------:|:---------------:|------------:|
| 32    | Barnes–Hut octree | 7.06e-2 | 4.91e-6 | **yes** | 2.1 |
| 32    | FMM cell evaluator | 1.68e+0 | 6.30e-5 | no  | 2.8 |
| 128   | Barnes–Hut octree | 7.15e-2 | 2.41e-5 | **yes** | 7.1 |
| 128   | FMM cell evaluator | 1.61e+0 | 2.43e-4 | no  | 11.0 |
| 512   | Barnes–Hut octree | 7.57e-2 | 9.44e-5 | **yes** | 14.0 |
| 512   | FMM cell evaluator | 1.15e+0 | 9.30e-4 | no  | 23.1 |
| 2048  | Barnes–Hut octree | 1.09e-1 | 4.52e-4 | no (marginal, 0.109 vs 0.1) | 56.6 |
| 2048  | FMM cell evaluator | 2.02e-1 | 8.99e-4 | no | 48.8 |

Reading:

- **Barnes–Hut** (fixed θ 0.7, table above) stays within the envelope through 512 particles and is
  marginal at 2048. With the population-scaled θ (§2a) it is within the envelope at every scale
  32–2048 on the CLI seed; see §2a for the periodic-image finding on other seeds.
- **FMM** (table above is the pre-2026-10-03 measurement) was outside the
  `rmsRelative` envelope at every scale. The 2026-10-03 bug hunt
  (`docs/FMM-INVESTIGATION.md`) fixed seven defects. Now: exact at 32 (single
  level, all near field); 2.5e-1 / 3.0e-1 / 3.0e-1 at 128 / 512 / 2048
  (seed 0x12345678), so FMM is still outside the 0.1 envelope from 128 up. The
  remaining error is a documented truncation hypothesis.

## 2a. Population-scaled θ (BH-ENV, D-008, 2026-10-03)

`bhThetaForPopulation(n)` (src/physics/octree.js): θ = 0.7 for n ≤ 128, −0.1 per doubling, floored at 0.5. The solver
uses min(gravTheta, scaled θ), so the default gravTheta 0.5 is unchanged. `bench:backends` now defaults to the scaled θ;
`node bench/backend-compare.mjs --scales` prints the envelope. CLI seed 0x9e3779b9:

| Count | θ | Barnes–Hut rmsRelative | within 0.1 |
|------:|---:|---:|:---:|
| 32 | 0.7 | 0.071 | yes |
| 64 | 0.7 | 0.051 | yes |
| 128 | 0.7 | 0.072 | yes |
| 256 | 0.6 | 0.055 | yes |
| 512 | 0.5 | 0.022 | yes |
| 1024 | 0.5 | 0.051 | yes |
| 2048 | 0.5 | 0.043 | yes |

Pinned by tests/unit/bhThetaEnvelope.test.js (7 scales plus seeds 12345 and 0xabcdef at 2048).

**Finding: θ is not the root cause at large N (decision for Gem).** On other seeds the error at 2048 stays at 0.12–0.14
(seed 0x12345678: 0.135 at θ 0.5, 0.138 at θ 0.3) and reaches 0.15–0.20 at 4,096–8,192, almost independent of θ until
θ ≤ 0.2. The cause is the periodic (minimum-image) approximation. A cell whose extent crosses the half-world cut has
members on both periodic images, so its centre of mass is a wrong far-field proxy. Opening such cells makes Barnes–Hut
accurate at every scale and seed tried (rms 0.002–0.011 at 32–8,192). But it is then barely faster than exact summation
(2048: 160 ms vs 122 ms; 8192: 1.4 s vs 2.1 s). Options: (a) ship the straddle-opening fix (accurate, slow);
(b) keep the fast approximation with the θ envelope above (seed-dependent at ≥ 2048); (c) a proper periodic tree
(replica cells / Ewald far field), which is a larger piece of work.

**Decision D-020 (Gem, 2026-10-04 09:57 AEST): option (b).** The θ envelope above stays as shipped; the straddle
fix is not applied. A proper periodic, wrap-aware tree (option c) is tracked as a separate Not started item
(BH-PERIODIC). Users who need tighter accuracy at ≥ 2,048 particles on arbitrary seeds should use the reference engine.

## 3. FMM decision (remediation plan §5.1)

**Decision: RETAIN EXPERIMENTAL.**

| Path | Verdict | Rationale |
|------|---------|-----------|
| Complete | rejected | Envelope parity is not demonstrated: rmsRelative was 1.15–2.02; after the 2026-10-03 fixes it is 0.25–0.30 from 128 up (still > 0.1). Re-confirmed by D-008 (FMM-PROMO Won't do). |
| Retire to historical | rejected | The cell builder and evaluator are real (the former `cellNeighbours` placeholder is now an implemented toroidal minimum-image stencil with parity tests), are useful as a research path, and cost nothing on the default path. |
| **Retain experimental** | **chosen** | Opt-in via `runtimeConfig.gravEngine === 'fmm'`, never default, misleading completion language replaced, explicit unsupported-case tests pin the out-of-envelope status. |

Consequences:

- `docs/FEATURE_STATUS_MATRIX.md` §3/§6 records the experimental status and the
  measured evidence.
- `tests/unit/fmmParity.test.js` pins: octree within envelope (≤128), FMM exact
  at 32 and finite but **outside** the envelope from 128 up, plus regression
  bounds for the hunt's fixes. If FMM accuracy improves further, that test
  fails and the status docs must be updated in the same change.
- Known FMM limitations remain as documented in `src/physics/fmm.js` header:
  quadrupole truncation, DNA modifiers absent from far-field contributions,
  minimum-image wrapping on cell centres.

## 4. WebGPU envelope status

WebGPU gravity has **no envelope row here by design**: hardware device
execution is an external-environment gate. The browser spec
(`tests/e2e/physics-worker.spec.js`) compares GPU vs CPU on a fixed fixture
(tolerance `1e-4`) when a device is granted, and asserts a bounded `null`
fallback when `navigator.gpu` is absent. Node contract tests
(`tests/unit/webgpuContract.test.js`) cover the deterministic CPU fallback,
gravity/collision gating, and pair-shape parity. Exact CPU CONTACT/COLL remain
CPU-owned (no double application) — asserted by
`tests/unit/backendArchitecture.test.js`.

## 5. Reproduce

```bash
npm run bench:backends                 # JSON envelope report, default seed
node bench/backend-compare.mjs --count 2048
npx vitest run tests/unit/fmmParity.test.js   # regression band (seed 0x12345678)
```
