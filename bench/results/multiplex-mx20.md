# MX-20 benchmark results (2026-10-03 AEST, box: 8 vCPU Xeon, no GPU)

## Headless presets (npm run bench:multiplex -- --presets --md --seconds 6 --warmup 3)

| Case | Sims × particles | Laws | Ticks | Main ms med / p95 | Frame ms med / p95 | Sim ms / tick | Sim ms / frame (all sims) | Ticks/s per sim (min) | Skipped | 60 fps |
|---|---|---|---|---|---|---|---|---|---|---|
| preset Smooth 20 | 20 × 125 | light | frame / pool 7 | 1.72 / 2.67 | 16.67 / 16.67 | 1.18 | 25.78 | 59.66 (59.43) | 12 | yes |
| preset Balanced | 20 × 500 | light | adaptive / pool 7 | 4.27 / 8.58 | 16.67 / 16.67 | 3.92 | 77.68 | 52.62 (41.76) | 0 | yes |
| preset Full fidelity | 20 × 2500 | full | adaptive / pool 7 | 0.03 / 0.83 | 16.67 / 19.77 | 783.37 | 173.31 | 0.45 (0.33) | 0 | yes |

## Headless combination grid (npm run bench:multiplex -- --md --seconds 5)

Box: 8 vCPU, no GPU; pool 7 workers; FIELD-ONCE true; 5s per case after 1s warm-up.

| Case | Sims × particles | Laws | Ticks | Main ms med / p95 | Frame ms med / p95 | Sim ms / tick | Sim ms / frame (all sims) | Ticks/s per sim (min) | Skipped | 60 fps |
|---|---|---|---|---|---|---|---|---|---|---|
| preset Smooth 20 | 20 × 125 | light | frame / pool 7 | 2.1 / 15.59 | 16.67 / 25.82 | 1.83 | 67.27 | 39.42 (34.38) | 1556 | no |
| preset Balanced | 20 × 500 | light | adaptive / pool 7 | 2.21 / 11.53 | 16.67 / 20.35 | 7.1 | 114.43 | 24.24 (16.4) | 0 | yes |
| preset Full fidelity | 20 × 2500 | full | adaptive / pool 7 | 0.04 / 0.87 | 16.67 / 19.62 | 1065.45 | 128.98 | 0.33 (0.2) | 0 | yes |
| grid 125/light/frame | 20 × 125 | light | frame / pool 7 | 1.79 / 2.93 | 16.67 / 16.67 | 1.23 | 27.67 | 59.6 (58.98) | 18 | yes |
| grid 125/light/adaptive | 20 × 125 | light | adaptive / pool 7 | 1.73 / 2.4 | 16.67 / 16.67 | 1.2 | 27.02 | 59.65 (58.97) | 0 | yes |
| grid 125/light/adaptive-inthread | 20 × 125 | light | adaptive / in-thread | 8.8 / 9.86 | 16.67 / 16.67 | 1.1 | 8.83 | 24.03 (24) | 0 | yes |
| grid 125/light/fixed | 20 × 125 | light | fixed / pool 7 | 0.51 / 1.24 | 16.67 / 16.67 | 1.33 | 7.07 | 14.93 (14.8) | 0 | yes |
| grid 125/full/frame | 20 × 125 | full | frame / pool 7 | 1.68 / 6.28 | 16.67 / 18.26 | 2.5 | 72.16 | 47.09 (36.41) | 1212 | yes |
| grid 125/full/adaptive | 20 × 125 | full | adaptive / pool 7 | 1.59 / 5.3 | 16.67 / 18.48 | 2.71 | 71.19 | 48.74 (39.23) | 0 | yes |
| grid 125/full/adaptive-inthread | 20 × 125 | full | adaptive / in-thread | 9.36 / 11.23 | 16.67 / 16.67 | 2.41 | 9.49 | 11.75 (11.58) | 0 | yes |
| grid 125/full/fixed | 20 × 125 | full | fixed / pool 7 | 0.52 / 1.4 | 16.67 / 16.68 | 3.39 | 25.1 | 14.95 (14.76) | 0 | yes |
| grid 500/light/frame | 20 × 500 | light | frame / pool 7 | 3.66 / 9.41 | 16.67 / 19.6 | 4.44 | 91.73 | 42.03 (30.17) | 1653 | yes |
| grid 500/light/adaptive | 20 × 500 | light | adaptive / pool 7 | 3.86 / 9.04 | 16.67 / 19.43 | 4.43 | 91.54 | 43.06 (32.62) | 0 | yes |
| grid 500/light/adaptive-inthread | 20 × 500 | light | adaptive / in-thread | 10.54 / 13.73 | 16.67 / 16.67 | 4.66 | 10.57 | 6.79 (6.61) | 0 | yes |
| grid 500/light/fixed | 20 × 500 | light | fixed / pool 7 | 0.94 / 2.81 | 16.67 / 16.67 | 4.01 | 35.09 | 14.53 (13.59) | 0 | yes |
| grid 500/full/frame | 20 × 500 | full | frame / pool 7 | 0.35 / 2.53 | 16.67 / 19.81 | 59.5 | 125.67 | 5.63 (4.4) | 5277 | yes |
| grid 500/full/adaptive | 20 × 500 | full | adaptive / pool 7 | 0.35 / 2.4 | 16.67 / 18.93 | 57.14 | 124.8 | 5.48 (2.8) | 0 | yes |
| grid 500/full/adaptive-inthread | 20 × 500 | full | adaptive / in-thread | 15.44 / 27.92 | 16.72 / 30.61 | 17.07 | 17.01 | 2.56 (2.4) | 0 | no |
| grid 500/full/fixed | 20 × 500 | full | fixed / pool 7 | 0.32 / 2.26 | 16.67 / 20.22 | 68.76 | 127.16 | 5.03 (3.2) | 0 | yes |
| grid 1000/light/frame | 20 × 1000 | light | frame / pool 7 | 1.9 / 12.72 | 16.67 / 20 | 12.66 | 125.19 | 16.38 (13.83) | 4145 | yes |
| grid 1000/light/adaptive | 20 × 1000 | light | adaptive / pool 7 | 1.94 / 11.53 | 16.67 / 17.99 | 12.05 | 121.93 | 17.98 (14.41) | 0 | yes |
| grid 1000/light/adaptive-inthread | 20 × 1000 | light | adaptive / in-thread | 13.1 / 17.69 | 16.67 / 18.88 | 13.22 | 13.26 | 2.94 (2.8) | 0 | no |
| grid 1000/light/fixed | 20 × 1000 | light | fixed / pool 7 | 1.12 / 5.76 | 16.67 / 20.2 | 11.79 | 99.33 | 9.43 (8.6) | 0 | yes |
| grid 1000/full/frame | 20 × 1000 | full | frame / pool 7 | 0.02 / 0.65 | 16.67 / 19.33 | 207.85 | 138.21 | 1.66 (1.2) | 5654 | yes |
| grid 1000/full/adaptive | 20 × 1000 | full | adaptive / pool 7 | 0.02 / 0.68 | 16.67 / 19.31 | 209.58 | 135.58 | 1.65 (1.2) | 0 | yes |
| grid 1000/full/adaptive-inthread | 20 × 1000 | full | adaptive / in-thread | 40.13 / 51.81 | 41.33 / 53.37 | 41.86 | 41.5 | 1.16 (1) | 0 | no |
| grid 1000/full/fixed | 20 × 1000 | full | fixed / pool 7 | 0.04 / 0.68 | 16.67 / 19.63 | 267.07 | 133.6 | 1.24 (0.8) | 0 | yes |
| grid 2500/light/frame | 20 × 2500 | light | frame / pool 7 | 0.04 / 2.09 | 16.67 / 20 | 262.16 | 137.97 | 1.43 (0.8) | 5657 | yes |
| grid 2500/light/adaptive | 20 × 2500 | light | adaptive / pool 7 | 0.56 / 2 | 16.67 / 20.6 | 83.47 | 139.2 | 2.07 (0.8) | 0 | yes |
| grid 2500/light/adaptive-inthread | 20 × 2500 | light | adaptive / in-thread | 51.41 / 75.51 | 52.53 / 76.69 | 53.75 | 53.16 | 0.91 (0.8) | 0 | no |
| grid 2500/light/fixed | 20 × 2500 | light | fixed / pool 7 | 0.02 / 1.67 | 16.67 / 20.13 | 205.57 | 142.78 | 1.81 (0.8) | 0 | yes |
| grid 2500/full/frame | 20 × 2500 | full | frame / pool 7 | 0.02 / 0.75 | 16.67 / 19.35 | 901.03 | 134.16 | 0.4 (0.2) | 5720 | yes |
| grid 2500/full/adaptive | 20 × 2500 | full | adaptive / pool 7 | 0.01 / 0.84 | 16.67 / 19.27 | 836.04 | 128.91 | 0.41 (0.2) | 0 | yes |
| grid 2500/full/adaptive-inthread | 20 × 2500 | full | adaptive / in-thread | 216.86 / 277.68 | 218.11 / 278.32 | 233.53 | 222.91 | 0.21 (0.2) | 0 | no |
| grid 2500/full/fixed | 20 × 2500 | full | fixed / pool 7 | 0.03 / 0.82 | 16.67 / 19.32 | 803.18 | 137.74 | 0.45 (0.4) | 0 | yes |

## Chrome real frame times (node bench/multiplex-render.mjs --md --seconds 8; SwiftShader software GL)

| Preset | Frames | Frame ms median / p95 / max | 60 fps (med ≤ 16.7, p95 ≤ 25) | Main-thread sim ms med / p95 | Render ms med / p95 | Pool | Ticks/s per sim |
|---|---|---|---|---|---|---|---|
| baseline | 107 | 66.67 / 116.67 / 166.7 | no | — | — | — | — |
| smooth-20 | 68 | 116.66 / 183.33 / 216.7 | no | 3.91 / 21.08 | 8.37 / 23.92 | 7 | 7.4 |
| balanced | 24 | 349.99 / 483.31 / 483.3 | no | 8.45 / 18.88 | 44.95 / 77.61 | 7 | 2.6 |
| full-fidelity | 10 | 883.3 / 1099.96 / 1100 | no | 4.21 / 20.85 | 91.72 / 224.2 | 7 | 0.5 |
