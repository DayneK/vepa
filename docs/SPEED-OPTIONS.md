# Speed sliders (D-036, replacing the D-034 on/off options)

Since D-036 the speed options are sliders in PERFORMANCE › SPEED (world
params, saved with the world). The multiplex law count is a slider in the
GRID & PERF tab, saved with the multiplex settings. Every default reproduces
the pre-option solver bit for bit: golden is 13/13 and the `bench:solver`
hashes are unchanged (1k `8d8c0ad7a9ce5201`, 2.5k `39917ba618ded639`, 10k
`af40cf9839ec09d7`). Away from the default, results change. **FAST** and
**DEFAULTS** are buttons that move the sliders. Saves that use the D-034 on/off
flags load as the matching slider values.

| Slider | Gem asked | Implemented | Default | FAST | Why this range |
|---|---|---|---|---|---|
| Multiplex LAW COUNT | 1–136 | 1–136, linear | 136 (all) | (16 = light set) | As asked. Ranking: the light set first (LIFE, ENERGY, REPRO leading, so small counts still live), then the other laws cheapest-first by leave-one-out cost (`bench/law-cost.mjs`, `src/multiplex/lawRanking.js`). Below 3 there is no life. |
| NEIGHBOUR LIMIT (`PAIRWISE_BUDGET`) | 4–256, default 96 | **8–512**, step 8, log | 96 | 48 | It is the existing per-particle pair budget, so no duplicate knob. Old saves hold up to 500, and clumps can exceed 256 neighbours. Below about 24, bonding collapses (10k: 8,846 bonded at 96, 5,228 at 24, 246 at 8) and 8 is no faster than 16, so the floor stays 8. |
| PAIR BUDGET / particle / tick | 1,000–100,000 world (current 200,000) | **per particle 8–511, OFF at 512**, log | OFF | 20 | Per particle as asked on 6:08 PM. 4 is no faster than 8 and leaves half the bonds. |
| MID RANGE | default 200 | **30–600**, step 5 | 200 | 120 | Floor = the near tier. Neighbours come only from the 27 surrounding grid cells (one cell is about 167 units up to about 2,400 particles, 105 at 10k), so nothing is gathered beyond about 2 cells. Speed gain appears only at 10k (×1.22 at 120, ×1.31 at 60). |
| NEAR / CONTACT RANGE (new) | "other distance thresholds" | **10–60** | 30 | 30 | The only other solver-level distance gate (contact, chemistry, bonds, heat). ×1.2–1.35 at 10, but about 3–9% fewer bonds. Law-internal radii (MIND 200, COMMS DNA radius, etc.) stay internal. |
| SYMBIOSIS & PARASITE RANGE | yes | **10–595, ANY at 600** | ANY | 30 | Gain is small (×1.0–1.1). |
| SOCIAL & INFO every N ticks | 1–100 | **1–16** | 1 | 2 | The gain flattens by 4 (×1.33–1.55) and is the same at 8, 16 and 100. Strength is not compensated, so above 8 the laws are nearly off. |

**Pairs are counted per particle.** The main loop walks each particle's own
neighbour list, so an i–j pair is visited once from i and once from j. The
particle's own list entry also uses one slot. The old 200,000-pairs-per-tick
cap was therefore 200,000 directed visits, shared as cap ÷ alive per
particle. At 10,000 particles that is 20 per particle; FAST uses 20, which
reproduces the old FAST hash exactly at 10k (`c49a3979170d5928`). Below 10k
the old cap never bit (200,000 ÷ 2,500 = 80 > 48). New FAST is therefore
stricter there: about 1.9x (1k) and 2.2x (2.5k) faster than the old FAST, with
2–3% fewer bonded particles.

Bench points (`bench:solver --sweep KEY=a/b/c`, one run each, ticks/s, ×
vs defaults; defaults 11.1 / 3.59 / 1.73 at 1k / 2.5k / 10k):

| Setting | 1k | 2.5k | 10k | bonded at 10k (default 8,846) |
|---|---|---|---|---|
| NEIGHBOUR LIMIT 48 | ×1.59 | ×1.77 | ×1.84 | 8,189 |
| NEIGHBOUR LIMIT 24 | ×2.61 | ×3.08 | ×3.99 | 5,228 |
| NEIGHBOUR LIMIT 16 | ×3.81 | ×4.41 | ×4.85 | 1,905 |
| NEIGHBOUR LIMIT 192 / 512 | ×0.87 | ×0.82 / 0.79 | ×0.83 | 8,929 / 8,832 |
| PAIR BUDGET 48 | ×1.63 | ×1.79 | ×1.12 (identical hash: 48 ≥ the 10k limit) | 8,846 |
| PAIR BUDGET 20 | ×2.97 | ×3.93 | ×2.13 | 7,601 |
| PAIR BUDGET 8 | ×4.65 | ×6.09 | ×5.24 | 1,905 |
| MID RANGE 120 / 60 | ×1.02 / 1.02 | ×1.02 / 1.02 | ×1.22 / 1.31 | ≈ same |
| NEAR RANGE 10 | ×1.25 | ×1.35 | ×1.18 | 8,078 |
| SYMBIOSIS RANGE 30 | ×1.01 | ×1.00 | ×1.11 | ≈ same |
| SOCIAL EVERY 2 / 4 / 8 / 16 | ×1.16 / 1.33 / 1.34 / 1.33 | ×1.15 / 1.36 / 1.44 / 1.45 | ×1.23 / 1.55 / 1.49 / 1.47 | ≈ same |
| FAST | ×3.14 | ×4.03 | ×3.27 | 7,606 |

Multiplex Full fidelity (20 × 2,500, `bench:multiplex --speed-matrix`, 9 Oct 20:05 AEST). "Ticks/s per sim" is the per-sim figure; the frame rate stays at 60 fps throughout:

Box: 8 vCPU, no GPU; pool 7 workers; FIELD-ONCE true; 4s per case after 1s warm-up.

| Case | Sims × particles | Laws | Ticks | Main ms med / p95 | Frame ms med / p95 | Sim ms / tick | Sim ms / frame (all sims) | Ticks/s per sim (min) | Skipped | 60 fps |
|---|---|---|---|---|---|---|---|---|---|---|
| Full fidelity speed=none | 20 × 2500 | full | adaptive / pool 7 | 0.02 / 1.09 | 16.67 / 19.46 | 458.24 | 145.03 | 0.79 (0.5) | 0 | yes |
| Full fidelity speed=PAIRWISE_BUDGET=48 | 20 × 2500 | full | adaptive / pool 7 | 0.02 / 0.71 | 16.67 / 18.76 | 430.72 | 140.74 | 0.8 (0.5) | 0 | yes |
| Full fidelity speed=SPEED_MID_RANGE=120 | 20 × 2500 | full | adaptive / pool 7 | 0.02 / 0.96 | 16.67 / 19.05 | 417.73 | 135.22 | 0.8 (0.5) | 0 | yes |
| Full fidelity speed=SPEED_PAIR_BUDGET=20 | 20 × 2500 | full | adaptive / pool 7 | 0.01 / 0.98 | 16.67 / 19.11 | 273.45 | 142.43 | 1.35 (1) | 0 | yes |
| Full fidelity speed=SPEED_SYMBIOSIS_RANGE=30 | 20 × 2500 | full | adaptive / pool 7 | 0.01 / 0.87 | 16.67 / 18.67 | 430.24 | 141.9 | 0.79 (0.5) | 0 | yes |
| Full fidelity speed=SPEED_SOCIAL_EVERY=2 | 20 × 2500 | full | adaptive / pool 7 | 0.01 / 0.68 | 16.67 / 18.7 | 414.54 | 141.36 | 0.88 (0.75) | 0 | yes |
| Full fidelity speed=fast | 20 × 2500 | full | adaptive / pool 7 | 0.01 / 1 | 16.67 / 19.41 | 216.6 | 142.55 | 1.61 (1.25) | 0 | yes |
| Full fidelity LAW COUNT 96 | 20 × 2500 | full top-96 | adaptive / pool 7 | 0.03 / 0.97 | 16.67 / 20 | 335.81 | 141.89 | 1.12 (0.5) | 0 | yes |
| Full fidelity LAW COUNT 48 | 20 × 2500 | full top-48 | adaptive / pool 7 | 0.46 / 1.55 | 16.67 / 19.98 | 170.97 | 144.92 | 2.22 (1) | 0 | yes |
| Full fidelity LAW COUNT 16 | 20 × 2500 | full top-16 | adaptive / pool 7 | 0.8 / 5.3 | 16.67 / 20 | 29.89 | 144.51 | 4.55 (1.25) | 0 | yes |
| Full fidelity LAW COUNT 16 + speed=fast | 20 × 2500 | full top-16 | adaptive / pool 7 | 1.76 / 10.89 | 16.67 / 19.93 | 16.5 | 132.71 | 11.52 (7.76) | 0 | yes |

Alive (all) and species (5) do not change in these short runs. Mean energy
rises by 1–3 with the stronger settings, because fewer pairwise drains run.

The sections below describe the original D-034 on/off options and their
measurements, kept for history.

## Original D-034 options (history)

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

## D-037: more speed controls, re-measured ranking, charts

### New slider: EXPENSIVE LAWS EVERY N TICKS (`SPEED_EXPENSIVE_EVERY`)

PERFORMANCE › SPEED, 1–16, default 1 (= every tick, results-identical: golden
13/13 and the bench:solver default hashes 300 `aff5b975305d4974`, 1k
`8d8c0ad7a9ce5201`, 2.5k `39917ba618ded639`, 10k `af40cf9839ec09d7` unchanged).
Above 1 the eight costliest non-social laws (`SPEED_EXPENSIVE_LAWS` in
`src/physics/solver.js`: BOND, CAPACITANCE, SUPERCONDUCTIVITY, COMPRESSION,
CRYSTALLIZATION, MAGNETISM, MELT, AUTOCATALYSIS — the top eight in both the
D-036 and D-037 leave-one-out benches) act on the first tick after a reset and
then every Nth tick, the same scheme as SOCIAL & INFO EVERY N. Saved with the
world; never varied by multiplex param variation; not part of FAST (FAST keeps
its D-036 results). Tests: `tests/unit/speedExpensive.test.js`.

The legacy `EXPENSIVE_LAW_CADENCE` param was never read by the solver. It was
not wired because existing saves and multiplex param variation already hold
random values for it (wiring it would silently change those worlds); its help
text now says it is unused.

bench:solver, TIDAL_BLOOM (has BOND, CRYSTALLIZATION, AUTOCATALYSIS on), 10
ticks, 1 run per point, speed-up vs default (bonded % at the end):

| N | 2,500 | 10,000 |
|---|---|---|
| 1 (default) | 1.00× (99%) | 1.00× (84%) |
| 2 | 2.00× (92%) | 1.17× (65%) |
| 4 | 2.42× (58%) | 1.21× (40%) |
| 8 | 2.85× (24%) | 1.24× (25%) |
| 16 | 3.37× (6%) | 1.35× (10%) |

Cost: bonds form and hold less (BOND is the costliest law), so bonded % falls fast above 2.

### Candidates measured and not added (gain < 5% or already a control)

| Candidate | Verdict |
|---|---|
| FIELD update interval | Skipped: `advanceFields` costs 0.37 ms per tick (dim 16) against ~280 ms/tick at 2.5k, ≤0.15%. |
| Substeps | Skipped: `SUBSTEPS` in main.js is dead (one solve per frame, DT 0.25); time scale is already TIME › SIM SPEED; multiplex already has SUBSTEPS. |
| Grid cell size | Already a control: PERFORMANCE › GRID › GRID RESOLUTION with AUTO-TUNE. |
| Max bonds per particle | Skipped: bonds use three fixed partner slots; CHEMISTRY › POLYMER LIMIT already exists. No loop to cap. |
| Per-category cadence | Covered by SOCIAL & INFO EVERY N and EXPENSIVE EVERY N; in the D-037 law-cost run, 90 of 136 laws read as ≤0 ms (noise), so other categories have no measurable cost to skip. |
| Render: glow/halo, trails | Skipped: halos are drawn only for collapsed stars and there are no motion trails; eco mode (no halos, no grid) already exists for previews. |
| Render: draw every Nth frame, max drawn particles | Not measured: needs real-GPU frame timing; headless Chrome here is software-rendered. |
| Multiplex tick budget / workers | Already controls: FRAME BUDGET (ms) and the worker pool; `workerCount` 0 = one per spare core, the maximum, so no default-preserving gain. |

### Law-cost re-measured (quiet box) and LAW COUNT ranking

`node bench/law-cost.mjs --count 1000 --ticks 15 --reps 2` at load ~1 (all-laws
base 141 ms/tick; raw output in `/workspace/out/speed-charts/law-cost-d037.json`).
The light set (first 16) is unchanged, so LAW COUNT 16 and 136 give the same
results as before; the order after 16 changed, so other LAW COUNT values change.
Multiplex Full fidelity (20 sims × 2,500, worker pool), ticks/s per sim:

| LAW COUNT | 136 | 112 | 96 | 64 | 48 | 32 | 16 | 8 | 1 |
|---|---|---|---|---|---|---|---|---|---|
| ticks/s per sim | 0.66 | 1.30 | 1.33 | 1.83 | 3.45 | 3.58 | 3.86 | 5.22 | 13.1 |

### Charts

`/workspace/out/speed-charts/individual.png` (each slider swept alone) and
`cumulative.png` (sliders stacked at FAST values, then aggressive values, with
bonded % as the behaviour cost); raw CSVs and the scripts are beside them.
Stacked FAST plus EXPENSIVE EVERY 2: 2.4× at 2.5k, 3.1× at 10k; everything
aggressive: 3.8× / 7.0×, but bonded % falls from 99/84 to 4/3.

## D-038: FIDELITY selector, RENDER RESOLUTION, final lever audit

### FIDELITY (replaces the FAST button)

PERFORMANCE › SPEED now starts with `FIDELITY: HIGH | MEDIUM | LOW` (CUSTOM
shows when the sliders match none) and DEFAULTS (= HIGH). The multiplex GRID &
PERF tab has the same FIDELITY select; it moves the shared world speed sliders
and LAW COUNT. Code: `SPEED_FIDELITY_LEVELS`, `fidelityPreset`, `fidelityOf`,
`SPEED_LOW_PRESET`, `FIDELITY_LAW_COUNT` in `src/state/worldParams.js`.

| Slider | HIGH (default) | MEDIUM (= old FAST) | LOW |
|---|---|---|---|
| Neighbour limit / particle | 96 | 48 | 16 |
| Mid range | 200 | 120 | 60 |
| Near / contact range | 30 | 30 | 20 |
| Pair budget / particle / tick | OFF (512) | 20 | 8 |
| Symbiosis & parasite range | ANY (600) | 30 | 10 |
| Social & info every N | 1 | 2 | 4 |
| Expensive laws every N | 1 | 1 | 4 |
| Multiplex LAW COUNT | 136 | 136 | 16 (light set) |

HIGH reproduces the normal solver bit for bit (golden 13/13; bench:solver
hashes unchanged). LOW was picked from the D-037 sweeps plus a 150-tick health
run (`/workspace/out/fidelity-bench/health-150ticks.csv`): no NaN, every
particle and all 5 species alive, bonds still form (87% at 2.5k, 55% at 10k
after 150 ticks, vs 99/98% at HIGH). Two milder candidates (neighbour 24, pair
budget 12) kept more bonds (85–92% at 10k) but were 30–45% slower.

What LOW gives up: each particle sees at most 16 neighbours and evaluates 8
pairs per tick, so forces are coarse and many weak long-range interactions are
dropped; mid-range laws stop at 60 and contact at 20; symbiosis/parasite only
act within 10; social/information laws and the eight costliest laws (incl.
BOND) run every 4th tick at the same per-tick strength (so ~¼ of their effect).
Bonded structures form much more slowly (11% / 4% bonded after 30 ticks at
2.5k / 10k vs 99% / 95% at HIGH) and the energy budget differs (mean energy
~75 vs ~32–53 at HIGH after 150 ticks, because fewer interactions spend it). In
the multiplex, LOW also keeps only the 16 light-set laws in the previews.

Full HIGH/MEDIUM/LOW bench (solver at 100 … 50k, headless browser, multiplex,
memory): `/workspace/out/fidelity-bench/README.md` and `fidelity-bench.png`.

### RENDER RESOLUTION (MAX PIXEL RATIO) and DRAW EVERY N FRAMES — new, render-only

`RENDER_MAX_DPR`, PERFORMANCE › SPEED, 1–2, step 0.25, default 2 (= the
renderer's existing cap, unchanged). Caps the particle canvas pixel ratio;
never touches the simulation; saved with the world; never varied by multiplex;
not part of FIDELITY. Headless Chrome with NO GPU (SwiftShader), screen DPR 2:

| Particles | 2 (default) | 1.5 | 1 |
|---|---|---|---|
| 2,500 fps | 34.4 | 45.3 (1.32×) | 58.2 (1.69×) |
| 10,000 fps | 11.9 | 14.9 (1.25×) | 20.5 (1.72×) |

Software rasterisation exaggerates fill cost; on a real GPU the gain will be
smaller, and there is none on a screen whose pixel ratio is already 1.

### Final audit: are there more levers?

| Lever | Verdict |
|---|---|
| Render resolution (pixel-ratio cap) | ADDED (above): ≥25% fps on a DPR-2 screen in the no-GPU bench. |
| Draw every Nth frame | ADDED: `RENDER_EVERY` (DRAW EVERY N FRAMES, 1–4, default 1 = unchanged, render-only, saved, never varied by multiplex). No-GPU bench, 1280×800 DPR 1: at 2,500 particles sim ticks/s 1.80 → 2.20 (N=2, +22%) → 2.39 (N=3, +33%) because the skipped drawing frees CPU the worker shares; at 10,000 the sim rate stayed 1.20 (worker-bound) and only the main thread got idle time. Motion is choppier, so it is off by default. |
| Max drawn particles | Not added. It hides particles (not visually identical) and the pixel-ratio test shows the canvas cost here is mostly pixel fill (DPR 2 → 1 gave 1.7×; 1280×800 → 640×400 gave 1.5×), which RENDER RESOLUTION already addresses without hiding anything. Not measured separately (no per-particle draw cap exists to toggle). |
| Glow/halo, trails | None to cut: halos only on collapsed stars, no trails (D-037). |
| PixiJS (WebGL) backend | Already a launch setting (renderBackend); not benchmarkable without a GPU. |
| Multiplex workers / frame budget / LAW COUNT | Already controls; FIDELITY LOW now sets LAW COUNT 16 (19.3 vs 0.74 ticks/s per sim at HIGH). |
| FIELD interval, substeps, grid cell size, max bonds, per-category cadence | Skipped in D-037 (<5% or already a control). |

So beyond RENDER RESOLUTION and DRAW EVERY N FRAMES, no lever with a measured
≥5% gain remains that does not duplicate an existing control or hide what the
user sees. Remaining speed would need structural work (e.g. a GPU solver path,
SIMD/WebAssembly pair loop, or Barnes–Hut for long-range forces), not a slider.

### Cumulative chart v2 (3 interleaved repeats, error bars)

`/workspace/out/speed-charts/cumulative-v2.png` (+ `cumulative-v2-raw.csv`,
`cumulative-v2-summary.csv`). Every stage has a deterministic hash, which
separates noise from real effects:

- Pure noise (identical hash = identical computation): at 2.5k "aggressive:
  neighbour 24" equals the stage before (pair budget 20 already caps below 24);
  at 10k "+ pair budget 12" equals "neighbour 24" (the adaptive neighbour limit
  at 10k is already 12). The 4.49 → 4.39 "dip" at 10k is therefore noise.
- Noise (min–max ranges overlap): 2.5k "+ mid range 120" (2.06 → 1.78,
  1.61–2.27), 2.5k "+ pair budget 20", 10k "+ social every 2", 10k
  "+ near range 20".
- Small real dips (ranges do not overlap, about 3–6%): 2.5k "+ symbiosis 10"
  (3.04 → 2.94) and 2.5k "+ near range 20" (3.69 → 3.48). Here the pair
  budget (12) is already the binding limit, so narrowing a range saves no pair
  work but still adds a distance test per pair and changes the simulated state
  (different hash, bonded % 6.6 → 3.9), which moves pairs between the cheaper
  mid tier and the dearer near tier. That is option-overlap overhead: once the
  budget binds, the range sliders cost a little instead of saving.
