# Speed options (D-034)

Six switches trade fidelity for speed. **Every one is off by default and
changes results when on.** With all of them off the solver is bit-identical to
b9696d6: golden parity is 13/13 and the `bench:solver` hashes are unchanged
(300 `686064f58389c467`, 1k `dc4a93d0ec2412b7`, 2.5k `0e3841c2ebb2e3d3`,
10k `5be33d11978dd5da`). Each option is deterministic under a seed.

| # | Option | Where | What it does when on |
|---|---|---|---|
| 1 | FULL FIDELITY · LIGHT LAWS | Multiplex › GRID & PERF (saved with multiplex settings) | The Full fidelity preset solves with the light law set instead of each sim's full laws. |
| 2 | NEIGHBOUR LIMIT 48 (`SPEED_NEIGHBORS_48`) | SETUP › WORLD › PERFORMANCE › SPEED | Per-particle neighbour budget 48 instead of 96 (scaled down above 2,500 particles like the default). |
| 3 | NARROW MID RANGE (120) (`SPEED_NARROW_MID`) | same | The mid distance tier stops at 120 instead of 200. |
| 4 | PAIR CAP / TICK (200K) (`SPEED_PAIR_CAP`) | same | At most ~200,000 pairs per tick, shared evenly: each particle gets 200,000 ÷ alive neighbours (≥ 8). |
| 5 | NEARBY-ONLY SYMBIOSIS & PARASITE (`SPEED_NEAR_SYMBIOSIS`) | same | SYMBIOSIS and PARASITE act only on pairs closer than 30 (the bonding laws' contact tier). |
| 6 | SOCIAL & INFO LAWS EVERY 2ND TICK (`SPEED_SOCIAL_HALF`) | same | COMMS, TELEPATHY and the information laws (except HISTORY) act on odd solver ticks only, without compensation. |
| – | FAST (ALL SPEED OPTIONS) (`SPEED_FAST`) | same | Turns options 2–6 on together. Option 1 stays separate. |

Options 2–6 are world params, so they are saved with the world. A save from
before them loads with them off. Multiplex parameter variation never changes
them, and skips them before drawing, so the variation stream is unchanged.

## Why 120 for the mid range

Pair-distance histogram on the `bench:solver` world (TIDAL BLOOM, world 2,000),
measured with the solver's pair probe:

| Particles | < 30 (near) | < 120 | < 200 (old mid) |
|---|---|---|---|
| 300 | 17% | 48% | 70% |
| 1,000 | 7% | 31% | 56% |
| 2,500 | 14% | 36% | 59% |
| 10,000 | 16% | 47% | 87% |

120 is the default NEIGHBORHOOD_RADIUS that signal exchange (COMMS) already
uses as its own cut-off, so default-DNA signalling keeps its full reach. The
other ten mid-tier laws lose only their weakest, far reach. Only 11 laws are
mid-gated, so the speed gain is modest (about 0–12%).

## Measurements (box: 8 vCPU, Node 22, load about 0.3–1.7)

`node bench/solver-tps.mjs --runs 3 --speed-matrix` (median of 3 fresh
processes, ticks/s, gain vs off):

| Option | 300 | 1,000 | 2,500 | 10,000 |
|---|---|---|---|---|
| off | 69.9 | 11.3 | 3.57 | 1.84 |
| 2 neighbour limit 48 | 70.6 (1.01x) | 19.1 (1.69x) | 6.35 (1.78x) | 3.23 (1.76x) |
| 3 narrow mid | 73.9 (1.06x) | 11.3 (1.00x) | 3.62 (1.01x) | 2.07 (1.12x) |
| 4 pair cap | 69.7 (1.00x) | 11.2 (0.99x) | 4.13 (1.16x) | 3.79 (2.06x) |
| 5 nearby-only symbiosis | 68.9 (0.99x) | 11.1 (0.98x) | 3.43 (0.96x) | 1.84 (1.00x) |
| 6 social every 2nd tick | 75.9 (1.09x) | 13.0 (1.15x) | 3.98 (1.11x) | 2.04 (1.11x) |
| FAST (2–6) | 76.0 (1.09x) | 19.1 (1.69x) | 6.76 (1.89x) | 5.63 (3.06x) |

`node bench/multiplex-bench.mjs --speed-matrix --seconds 10 --warmup 2`
(Full fidelity, 20 × 2,500, pool 7):

| Case | Ticks/s per sim (slowest) | Worker ms / tick |
|---|---|---|
| off | 1.11 (0.8) | 332 |
| 2 neighbour limit 48 | 1.25 (0.8) | 310 |
| 3 narrow mid | 1.25 (0.8) | 298 |
| 4 pair cap | 1.16 (0.8) | 322 |
| 5 nearby-only symbiosis | 1.21 (0.9) | 311 |
| 6 social every 2nd tick | 1.29 (0.9) | 290 |
| all (2–6) | 1.61 (1.1) | 162 |
| 1 light laws | 10.93 (8.3) | 25 |
| 1 light laws + all | 11.97 (9.6) | 23 |

## How much each option changes the sim

`bench:solver` world, `--ticks N --warm 0`, values at the end (alive ·
species · bonded particles · mean energy). No births occur in this many ticks
in this world.

1,000 particles, 600 ticks:

| Option | Alive | Species | Bonded | Mean energy |
|---|---|---|---|---|
| off | 965 | 5 | 955 | 0.30 |
| 2 | 968 | 5 | 927 | 0.27 |
| 3 | 962 | 5 | 938 | 0.96 (15 particles with NaN energy) |
| 4 | identical to off (the cap does not bite at 1,000) | | | |
| 5 | 970 | 5 | 953 | n/a (NaN energy present) |
| 6 | 970 | 5 | 958 | 0.34 |
| FAST | 972 | 5 | 954 | n/a (NaN energy present) |

2,500 particles, 300 ticks:

| Option | Alive | Species | Bonded | Mean energy |
|---|---|---|---|---|
| off | 2,500 | 5 | 2,485 | 13.7 |
| 2 | 2,500 | 5 | 2,453 | 29.6 |
| 3 | 2,500 | 5 | 2,485 | 14.0 |
| 4 | 2,500 | 5 | 2,489 | 11.8 |
| 5 | 2,500 | 5 | 2,484 | 15.4 |
| 6 | 2,500 | 5 | 2,478 | 26.2 |
| FAST | 2,500 | 5 | 2,454 | 53.9 |

Population and species counts barely move over these spans (within about
1%). The visible differences are in bonding (options 2 and FAST bond about
1–3% fewer particles) and especially in the energy budget. Options 2, 6 and
FAST leave particles with 2–4x more energy at 2,500 because fewer pairwise
drains run. Over longer runs that is likely to show up as different survival
and reproduction.

**Finding (fixed by D-035, 9 Oct):** in several on-runs at 1,000 particles,
some alive particles ended with NaN energy (15 of 962 with option 3). It was
not caused by the options: the same world had 64 particles with non-finite
fields with every option off. Two laws were at fault. GENOTYPE let somatic
DNA drift out of range (MEMORY_DECAY below 0 → NaN from `pow`), and MIND gave
an Infinity signal for coincident particles. Both are fixed at the source, and
a final solver guard now repairs and counts any non-finite ENERGY, SIGNAL,
MEMORY or TEMPERATURE. The tables above were measured before the fix; see
docs/GOLDEN-REBASELINE.md for the re-recorded hashes.
