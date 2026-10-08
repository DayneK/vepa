/**
 * VEPA v3 — HUD Overlay
 * Real-time stats display: FPS, particle count, tick telemetry.
 *
 * Top bar layout (D-025): `#### •  tick/fps` — the live population to the LEFT
 * of the status dot (a small circle whose hue tracks the population), then the
 * tick count stacked above the render fps.
 *
 * Upstream v9.3.0 merge (D-031): keeps the D-025 visual layout and adopts the
 * upstream HUD's non-visual improvements — createHUD can be re-run safely
 * (rAF + counters reset), ticks/sec is measured from tick deltas, stats:update
 * accepts the `particles` / `species` aliases, the tick readout carries a
 * spoken aria-label (tick, TPS, FPS), and an optional #hud-species element is
 * updated when present (it is not in the D-025 markup).
 */

let fpsDisplay = 0;
let frameCount = 0;
let lastFpsTime = 0;
let rafId = null;
let lastTickRateTime = null;
let lastTickRate = -1;
let ticksPerSecond = 0;
let lastTickShown = -1; // module scope: also read by the rAF loop below
let lastSpeciesShown = 0;

// Tick on the first line, measured render fps on the second (D-025). The
// optional third argument is accepted for upstream call sites and ignored.
export const formatTickStats = (tick, fps) =>
  `${(tick < 0 ? 0 : tick).toLocaleString('en-US')}\n${Number(fps || 0).toFixed(1)}`;

/** Spoken form of the tick readout (screen readers get TPS as well). */
export const tickAriaLabel = (tick, tps, fps) =>
  `Tick ${Math.max(0, tick)}, ${Number(tps || 0).toFixed(1)} ticks per second, ${Number(fps || 0).toFixed(1)} frames per second`;

/** The population readout: live (alive) particles, grouped with commas. */
export const formatPopulation = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');

const el = {
  particles: null,
  count: null,
  species: null,
  tick: null,
};

function readEl() {
  el.particles = document.getElementById('hud-particles');
  el.count = document.getElementById('hud-population-count');
  el.species = document.getElementById('hud-species');
  el.tick = document.getElementById('hud-tick');
  // The status dot's hue tracks the population; the number itself is the
  // separate #hud-population-count to its left.
  if (el.particles) {
    el.particles.classList.add('hud-particles');
    el.particles.setAttribute('aria-label', 'Population indicator: loading');
  }
  if (el.species) el.species.textContent = 'SPECIES —';
  if (el.tick) el.tick.classList.add('hud-tick');
}

function renderTick() {
  if (!el.tick) return;
  el.tick.textContent = formatTickStats(lastTickShown, fpsDisplay);
  el.tick.setAttribute('aria-label', tickAriaLabel(lastTickShown, ticksPerSecond, fpsDisplay));
}

function tick(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fpsDisplay = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    renderTick();
  }
  rafId = requestAnimationFrame(tick);
}

/**
 * Create the HUD overlay. Subscribes to events and starts the FPS counter.
 *
 * @param {import('../core/eventBus.js').EventBus} bus
 */
export function createHUD(bus) {
  readEl();
  if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
  frameCount = 0;
  fpsDisplay = 0;
  lastFpsTime = performance.now();
  lastTickRateTime = null;
  lastTickRate = -1;
  ticksPerSecond = 0;
  lastTickShown = -1;
  lastSpeciesShown = 0;
  rafId = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(tick) : null;

  let lastShown = -1;
  // Population = alive particles. sim:metrics carries populationAlive (already
  // computed every 30 ticks); until it arrives, particleCount (which also
  // counts dead slots, since slots are append-only) stands in.
  let alive = null;
  let lastParticleCount = 0;

  const showPopulation = (n) => {
    if (n === lastShown) return;
    lastShown = n;
    const text = formatPopulation(n);
    if (el.count) el.count.textContent = text;
    if (el.particles) {
      const hue = (n * 11) % 360;
      const intensity = Math.min(1, Math.max(0.25, n / 2500));
      el.particles.style.setProperty('--population-h', String(hue));
      el.particles.style.setProperty('--population-intensity', intensity.toFixed(2));
      el.particles.dataset.count = text;
      el.particles.setAttribute('aria-label', `Population indicator: ${text} particles alive`);
    }
  };

  // Throttle DOM writes: population text only changes when the value changes.
  // Tick telemetry is compact; ticks/sec is measured over >= 1 s windows.
  const updateStats = (particleCount, speciesCount, t) => {
    if (particleCount !== undefined) {
      // A restart/restore shrinks the buffer: the old alive count is stale.
      if (particleCount < lastParticleCount) alive = null;
      lastParticleCount = particleCount;
      showPopulation(alive ?? particleCount);
    }
    if (speciesCount !== undefined && speciesCount !== lastSpeciesShown && el.species) {
      lastSpeciesShown = speciesCount;
      el.species.textContent = `SPECIES ${Number(speciesCount).toLocaleString('en-US')}`;
      el.species.setAttribute('aria-label', `${Number(speciesCount).toLocaleString('en-US')} species`);
    }
    if (t !== undefined && el.tick) {
      const now = performance.now();
      if (lastTickRateTime === null) {
        lastTickRate = t;
        lastTickRateTime = now;
      }
      const elapsed = now - lastTickRateTime;
      if (elapsed >= 1000) {
        ticksPerSecond = Math.max(0, t - lastTickRate) * 1000 / elapsed;
        lastTickRate = t;
        lastTickRateTime = now;
      }
      lastTickShown = t;
      renderTick();
    }
  };

  bus.on('physics:tick', ({ tick: t, particleCount, speciesCount }) => {
    updateStats(particleCount, speciesCount, t);
  });

  bus.on('sim:metrics', (m) => {
    if (m && Number.isFinite(m.populationAlive)) { alive = m.populationAlive; showPopulation(alive); }
  });

  // Also listen for direct stat updates
  bus.on('stats:update', ({ particles, particleCount, species, speciesCount, tick: t }) => {
    updateStats(particleCount ?? particles, speciesCount ?? species, t);
  });
}
