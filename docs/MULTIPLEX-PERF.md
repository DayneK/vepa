# Chaos Multiplex at scale (MX-20, AC-95)

Gem's target (D-014, 2026-10-03 06:15 AEST): run about 20 sims at once at 2.5% population each, with no lag.
Confirmed (D-017, 06:55 AEST): 2.5% = 2,500 particles per sim; 60 fps = median frame ≤ 16.7 ms and p95 ≤ 25 ms.
Decision (D-016, 06:55 AEST): implement a **configurable combination** of (A) smaller previews, (B) a light preview law set
and (C) sim ticks decoupled from render, plus FIELD-ONCE on by default and a worker pool.

## What ships (MX-20)

| Knob (multiplex config) | Values | Where |
|---|---|---|
| `particlesPerSim` | 0 (use POP %) or 125–2,500; kept in step with POP % / SIM (2,500 = 2.5%) | setup modal, PERFORMANCE |
| `lawTier` | `full` (each sim's own laws) or `light` (own laws ∩ light set) | PREVIEW LAWS |
| `lightLaws` | editable list; `null` = default light set | text box + RESET |
| `tickMode` | `frame` (one tick per drawn frame; a busy sim skips the frame), `fixed` (`ticksPerSecond` per sim), `adaptive` (as fast as the pool/budget allows; render keeps 60 fps) | SIM TICKS |
| `ticksPerSecond` | 0.5–240 (fixed mode) | TICKS / SEC |
| `frameBudgetMs` | 1–14 ms of in-thread sim time per frame (no workers) | BUDGET MS |
| `useWorkers`, `workerCount` | worker pool on/off; 0 = cores − 1 (capped at sims) | WORKER POOL |

Settings persist in `localStorage` under `vepa-multiplex-settings` (`src/multiplex/multiplexSettings.js`).

**Presets** (`MULTIPLEX_PRESETS`):

| Preset | Grid | Particles / sim | Laws | Ticks |
|---|---|---|---|---|
| Smooth 20 | 5 × 4 | 125 | light | every frame (pool) |
| Balanced | 5 × 4 | 500 | light | adaptive (pool) |
| Full fidelity | 5 × 4 | 2,500 (2.5%) | full | adaptive (pool) — sims tick slowly, UI stays responsive |

**Default light law set** (`src/multiplex/previewLaws.js`, `DEFAULT_LIGHT_LAWS`): GRAV DRAG ENTR BUOYANCY COLL ACCR TIDE FIELD
HEAT CONVECTION LATENT_HEAT EQUILIBRIUM GLOW LIFE ENERGY REPRO. It keeps motion, heat, life, energy and reproduction and drops the
most expensive pairwise social, information and chemistry laws (SYMBIOSIS, SYMBOL, METRIC, FEEDBACK, PREDATION and similar), picked by
ablation on a 1,000-particle TIDAL_BLOOM world. A sim's own law set is never changed: fitness, export and copy-to-world still see every law.

**Worker pool** (`shardPool.js`, `shardWorker.js`, `shardWorkerCore.js`): each sim is pinned to worker `key % size`; a tick message
carries a copy of the sim's particles, DNA, (masked) law words, PRNG state, world params and runtime flags; the reply carries them back
plus offspring. Stale replies after a rebuild/revert are dropped by sequence and epoch. Pooled runs are bit-identical to in-thread runs
(`tests/unit/multiplexIsolation.test.js`).

**HIDDEN-STATE fix (AC-97)**: the solver's module state (field medium, HISTORY/law clocks, solve tick) now lives in a *solver context*
(`createSolverContext` / `enterSolverContext` in `solver.js`). Each multiplex sim has its own context, in-thread and in workers, so sims
no longer share field or history state with each other or with the main world. The isolation test fails if contexts are disabled.

## Benchmarks (2026-10-03, box: 8 vCPU Xeon, no GPU; full tables in `bench/results/multiplex-mx20.md`)

    npm run bench:multiplex                       # presets + combination grid (real-time 60 fps loop, worker_threads pool)
    npm run bench:multiplex -- --presets --md     # presets only;  --grid  grid only;  --preset smooth-20
    npm run bench:multiplex -- --legacy --shards 20 --pop 2500   # old lock-step timing
    node bench/multiplex-render.mjs --md          # Chrome real frame times (needs npm run dev -- --port 4173)

Headless presets (6 s each after 3 s warm-up; pool of 7 workers):

| Preset | Main-thread ms med / p95 | Frame interval med / p95 | Sim ms per tick | Ticks/s per sim (min) | 60 fps (headless) |
|---|---|---|---|---|---|
| Smooth 20 (20 × 125, light, frame) | 1.72 / 2.67 | 16.67 / 16.67 | 1.2 | 59.7 (59.4) | yes, and sims keep pace (1 tick per frame) |
| Balanced (20 × 500, light, adaptive) | 4.27 / 8.58 | 16.67 / 16.67 | 3.9 | 52.6 (41.8) | yes |
| Full fidelity (20 × 2,500, full, adaptive) | 0.03 / 0.83 | 16.67 / 19.77 | 783 | 0.45 (0.33) | yes (UI); sims run in slow motion |

Chrome (SwiftShader software GL on this GPU-less box): no configuration reaches 60 fps, **including the app with no multiplex
running (baseline 67–83 ms median frame)**. With Smooth 20 the multiplex's own main-thread work is 3.9 ms sim + 8.4 ms render (median),
which fits the 16.7 ms budget; the remaining frame time is software compositing/rasterisation on the CPU. A real-GPU measurement is pending.

Known: per-tick cost in a worker is about 1.3× the in-thread cost for one sim, rising to about 3× when 20 × 2,500 sims share 7 workers
(likely cache pressure from per-sim field state). Full fidelity therefore gains only about 2× from the pool on this box.

## History (before D-016)

### How it was measured

    npm run bench:multiplex -- --shards 20 --pop 2500 --frames 300 --warmup 60 [--field-once] [--laws tidal|none] [--json]

This measures the simulation only (headless Node, main thread). Browser render timing is still pending. The sim misses the budget by more than 300×, so render timing would not change the verdict yet.

### Measured (box: 8 vCPU, Node 22.23.3; TIDAL_BLOOM laws and params; clone mode; variation 0.3)

| Configuration | Shards built | Per-shard buffer | Frame time (median) |
|---|---|---|---|
| Before (f3af960), 1 × 2,500 | 1 | 38.1 MB | 1,656 ms |
| Before, 20 × 2,500 requested | **16** (MAX_SHARDS cap) | 38.1 MB (≈ 760 MB for 20) | 23,462 ms |
| After, 20 × 2,500, legacy fields | 20 | 1.0 MB | 29,607 ms |
| After, 20 × 2,500, `fieldAdvanceOnce` | 20 | 1.0 MB | 5,117 ms |
| After, 20 × 500, `fieldAdvanceOnce` | 20 | 0.2 MB | 405 ms |
| After, 20 × 250, `fieldAdvanceOnce` | 20 | 0.1 MB | 147 ms |
| After, 20 × 125, `fieldAdvanceOnce` | 20 | 0.1 MB | 59 ms |

Per-shard cost scales roughly as N² below the neighbour cap: 125 → 6 ms, 500 → 35 ms, 1,000 → 102 ms and 2,500 → 713 ms for one shard, before the compatibility fast path.

### What was wrong (bottlenecks, in order of cost)

1. **FIELD-ONCE (behaviour bug, needs Gem).** `advanceFields()` sits *inside* the per-particle loop of `solve()`, so the field medium (diffusion, decay, advection over every grid cell) advances once per particle: 2,500 times per tick for a 2,500-particle world. This bug is present in the main world too, and has been since the initial import. It was 64% of shard time. Fixing it changes default behaviour; Gem approved it as the default (D-016), see docs/GOLDEN-REBASELINE.md.
2. **Relationship compatibility allocations.** Each neighbour pair allocated two 42-element arrays plus 5 objects. This was about 30% of time. It is now an allocation-free, bit-identical path (`compatibilityForViewsInto`), checked by a unit test and golden parity: −33% tick time.
3. **Memory.** Every shard allocated a 100,000-particle buffer (38 MB). Buffers are now sized to the shard cap plus 64 slots: 1 MB at 2,500.
4. **Shard limit.** `MAX_SHARDS` was 16 and the grid was 4×4. It is now 25 and 5×5.
5. **Single thread.** All shards step synchronously on the main thread, inside the frame. The design runs solver code from shared module state (`setBuffer`, the field-system singleton and other module-level registries), so shards also share field state with each other and with the main world. **Pending:** a worker pool (one worker per core, shards partitioned across it) would give up to about 7× on 8 cores, and would also isolate per-shard module state. That isolation is itself a behaviour change, so it needs Gem's decision. Estimated at 2–3 agent-days.

### Why the target is not reachable without a product decision

After the safe fixes, one 2,500-particle shard under the full 41-law TIDAL_BLOOM set costs about 270 ms per tick. Twenty such shards at 60 fps need about 3 million particle-ticks per second, against about 9,000 today. A 7× worker pool still leaves roughly 45× to find. Options for Gem:

- **(a)** Previews run at a lower population. 20 × 125 is about 59 ms single-threaded, and about 10 ms with a pool.
- **(b)** Previews run a reduced "preview law tier".
- **(c)** Previews tick slower than they render (for example 10 Hz sim with 60 fps interpolation). This breaks the "one tick per frame" clause.
- **(d)** Accept that the default-law 2,500 / sim case is a slow-motion mode.
