/**
 * VEPA v3 — HUD Overlay
 * Real-time stats display: FPS, particle count, tick telemetry.
 *
 * Top bar layout (D-025): `#### •  tick/fps` — the live population to the LEFT
 * of the status dot (a small circle whose hue tracks the population), then the
 * tick count stacked above the render fps.
 */
import { PARTICLE_STRIDE, STRIDE_INDEXES } from '../constants.js';

let fpsDisplay = 0;
let frameCount = 0;
let lastFpsTime = 0;
let rafId = null;
let physicsTickCount = 0;
let lastPhysicsTime = 0;
let ticksPerSecond = 0;
let lastTickShown = -1; // module scope: also read by the rAF loop below

// Tick on the first line, measured render fps on the second.
export const formatTickStats = (tick, fps) =>
  `${(tick < 0 ? 0 : tick).toLocaleString('en-US')}\n${Number(fps || 0).toFixed(1)}`;

/** The population readout: live (alive) particles, grouped with commas. */
export const formatPopulation = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');

const el = {
  particles: null,
  count: null,
  tick: null,
};

function readEl() {
  el.particles = document.getElementById('hud-particles');
  el.count = document.getElementById('hud-population-count');
  el.tick = document.getElementById('hud-tick');
  // The status dot's hue tracks the population; the number itself is the
  // separate #hud-population-count to its left.
  if (el.particles) {
    el.particles.classList.add('hud-particles');
    el.particles.setAttribute('aria-label', 'Population indicator: loading');
  }
  if (el.tick) el.tick.classList.add('hud-tick');
}

function tick(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fpsDisplay = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    if (el.tick) el.tick.textContent = formatTickStats(lastTickShown, fpsDisplay);
  }
  rafId = requestAnimationFrame(tick);
}

/**
 * Compute alive particle count from the buffer.
 */
function countAlive(buffer, count) {
  if (!buffer) return 0;
  let alive = 0;
  for (let i = 0; i < count; i++) {
    if (buffer[i * PARTICLE_STRIDE + STRIDE_INDEXES.DEAD] < 0.5) {
      alive++;
    }
  }
  return alive;
}

/**
 * Create the HUD overlay. Subscribes to events and starts the FPS counter.
 *
 * @param {import('../core/eventBus.js').EventBus} bus
 */
export function createHUD(bus) {
  readEl();
  lastFpsTime = performance.now();
  rafId = requestAnimationFrame(tick);

  let currentTick = 0;
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
      el.particles.setAttribute('aria-label', `Population indicator: ${text} active entities`);
    }
  };

  // Throttle DOM writes: population text only changes when the value changes.
  // Tick telemetry is compact and refreshed once per second.
  const updateStats = (particleCount, _speciesCount, t) => {
    if (particleCount !== undefined) {
      // A restart/restore shrinks the buffer: the old alive count is stale.
      if (particleCount < lastParticleCount) alive = null;
      lastParticleCount = particleCount;
      showPopulation(alive ?? particleCount);
    }
    if (t !== undefined && el.tick) {
      const now = performance.now();
      physicsTickCount++;
      if (!lastPhysicsTime) lastPhysicsTime = now;
      const elapsed = now - lastPhysicsTime;
      if (elapsed >= 1000) {
        ticksPerSecond = physicsTickCount * 1000 / elapsed;
        physicsTickCount = 0;
        lastPhysicsTime = now;
      }
      lastTickShown = t;
      el.tick.textContent = formatTickStats(lastTickShown, fpsDisplay);
    }
  };

  bus.on('physics:tick', ({ tick: t, particleCount, speciesCount }) => {
    currentTick = t;
    updateStats(particleCount, speciesCount, t);
  });

  bus.on('sim:metrics', (m) => {
    if (m && Number.isFinite(m.populationAlive)) { alive = m.populationAlive; showPopulation(alive); }
  });

  // Also listen for direct stat updates
  bus.on('stats:update', ({ particleCount, speciesCount, tick: t }) => {
    updateStats(particleCount, speciesCount, t);
  });
}
