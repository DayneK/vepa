# Chaos Multiplex at scale (MX-20, AC-95)

Gem's target (D-014, 2026-10-03 06:15 AEST): run about 20 sims at once at 2.5% population each, with no lag.

Interpretation, flagged for Gem:
- 2.5% is taken of the default population cap (`PARTICLE_COUNT` = 100,000), which gives 2,500 particles per sim and 50,000 in total.
- "No lag" is proposed as: median frame ≤ 16.7 ms (60 fps) and p95 ≤ 25 ms, with every shard advancing one tick per frame.

## How to measure

    npm run bench:multiplex -- --shards 20 --pop 2500 --frames 300 --warmup 60 [--field-once] [--laws tidal|none] [--json]

This measures the simulation only (headless Node, main thread). Browser render timing is still pending. The sim misses the budget by more than 300×, so render timing would not change the verdict yet.

## Measured (box: 8 vCPU, Node 22.23.3; TIDAL_BLOOM laws and params; clone mode; variation 0.3)

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

## What was wrong (bottlenecks, in order of cost)

1. **FIELD-ONCE (behaviour bug, needs Gem).** `advanceFields()` sits *inside* the per-particle loop of `solve()`, so the field medium (diffusion, decay, advection over every grid cell) advances once per particle: 2,500 times per tick for a 2,500-particle world. This bug is present in the main world too, and has been since the initial import. It was 64% of shard time. Fixing it changes default behaviour, so the fix ships behind `runtimeConfig.fieldAdvanceOnce` (default `false`) and is **BLOCKED for Gem**.
2. **Relationship compatibility allocations.** Each neighbour pair allocated two 42-element arrays plus 5 objects. This was about 30% of time. It is now an allocation-free, bit-identical path (`compatibilityForViewsInto`), checked by a unit test and golden parity: −33% tick time.
3. **Memory.** Every shard allocated a 100,000-particle buffer (38 MB). Buffers are now sized to the shard cap plus 64 slots: 1 MB at 2,500.
4. **Shard limit.** `MAX_SHARDS` was 16 and the grid was 4×4. It is now 25 and 5×5.
5. **Single thread.** All shards step synchronously on the main thread, inside the frame. The design runs solver code from shared module state (`setBuffer`, the field-system singleton and other module-level registries), so shards also share field state with each other and with the main world. **Pending:** a worker pool (one worker per core, shards partitioned across it) would give up to about 7× on 8 cores, and would also isolate per-shard module state. That isolation is itself a behaviour change, so it needs Gem's decision. Estimated at 2–3 agent-days.

## Why the target is not reachable without a product decision

After the safe fixes, one 2,500-particle shard under the full 41-law TIDAL_BLOOM set costs about 270 ms per tick. Twenty such shards at 60 fps need about 3 million particle-ticks per second, against about 9,000 today. A 7× worker pool still leaves roughly 45× to find. Options for Gem:

- **(a)** Previews run at a lower population. 20 × 125 is about 59 ms single-threaded, and about 10 ms with a pool.
- **(b)** Previews run a reduced "preview law tier".
- **(c)** Previews tick slower than they render (for example 10 Hz sim with 60 fps interpolation). This breaks the "one tick per frame" clause.
- **(d)** Accept that the default-law 2,500 / sim case is a slow-motion mode.
