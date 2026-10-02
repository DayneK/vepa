#!/usr/bin/env node
// Chaos Multiplex real render frame times in Chrome (AC-95 / MX-20).
//
//   node bench/multiplex-render.mjs [--url http://127.0.0.1:4173/] [--seconds 8] [--md]
//
// Needs a running dev server (npm run dev -- --port 4173) and Chrome at
// $CHROME (default /usr/bin/google-chrome). For each preset it opens the app,
// starts the multiplex from the setup modal and records requestAnimationFrame
// intervals (= real frame times, render + UI thread) for N seconds.
// SwiftShader flags as in playwright.bench.config.js (no GPU on the box).
import { chromium } from '@playwright/test';

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
const URL_ = arg('url', 'http://127.0.0.1:4173/'), SECONDS = +arg('seconds', 8), MD = argv.includes('--md');
const PRESETS = (arg('presets', 'smooth-20,balanced,full-fidelity')).split(',');

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const results = [];
async function measure(page, seconds) {
  return page.evaluate((ms) => new Promise((resolve) => {
    const t = []; let last = performance.now(); const end = last + ms;
    const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else resolve(t); };
    requestAnimationFrame(f);
  }), seconds * 1000);
}
const stats = (t) => { const a = [...t].sort((x, y) => x - y); const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))]; return { frames: a.length, med: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +a[a.length - 1].toFixed(1) }; };

for (const id of ['baseline', ...PRESETS]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL_);
  // Dismiss the launch modal (boot waits on it) with the default world.
  await page.locator('.launch-primary').click({ timeout: 30_000 }).catch(() => {});
  await page.waitForFunction(() => Boolean(window.__VEPA_DEBUG__?._active && typeof window.openChaosMultiplex === 'function'), null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  let info = {};
  if (id !== 'baseline') {
    await page.evaluate(() => window.openChaosMultiplex());
    await page.selectOption('#mpx-preset', id);
    await page.click('#mpx-start');
    await page.waitForTimeout(3000); // warm-up (worker spin-up, JIT)
    info = await page.evaluate(() => {
      const ov = document.getElementById('multiplex-overlay');
      return { overlay: !!(ov && ov.classList.contains('active')) };
    });
  }
  const p0 = await page.evaluate(() => (window.__VEPA_MX_PERF__ ? window.__VEPA_MX_PERF__() : null));
  const t = await measure(page, SECONDS);
  const p1 = await page.evaluate(() => (window.__VEPA_MX_PERF__ ? window.__VEPA_MX_PERF__() : null));
  const ticks = p0 && p1 ? {
    sims: p1.ticks.length, pool: p1.pool, tpsPerSim: +(p1.ticks.reduce((a, v, i) => a + v - p0.ticks[i], 0) / p1.ticks.length / SECONDS).toFixed(1),
    stepMed: +p1.stepMedMs.toFixed(2), stepP95: +p1.stepP95Ms.toFixed(2), renderMed: +p1.renderMedMs.toFixed(2), renderP95: +p1.renderP95Ms.toFixed(2),
  } : null;
  const s = stats(t);
  results.push({ preset: id, ...s, fps: +(1000 / s.med).toFixed(1), meets60: s.med <= 16.7 && s.p95 <= 25, ...info, ticks, errors: errors.slice(0, 3) });
  await page.close();
}
await browser.close();
if (MD) {
  console.log('| Preset | Frames | Frame ms median / p95 / max | 60 fps (med ≤ 16.7, p95 ≤ 25) | Main-thread sim ms med / p95 | Render ms med / p95 | Pool | Ticks/s per sim |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of results) { const k = r.ticks; console.log(`| ${r.preset} | ${r.frames} | ${r.med} / ${r.p95} / ${r.max} | ${r.meets60 ? 'yes' : 'no'} | ${k ? k.stepMed + ' / ' + k.stepP95 : '—'} | ${k ? k.renderMed + ' / ' + k.renderP95 : '—'} | ${k ? k.pool : '—'} | ${k ? k.tpsPerSim : '—'} |`); }
  for (const r of results) if (r.errors.length) console.log(`\n${r.preset} page errors: ${r.errors.join(' | ')}`);
} else console.log(JSON.stringify(results, null, 1));
