// FSM-1 (AC-24): boot, render frame and worker tick in a real browser (dev server).
import { test, expect } from '@playwright/test';
import { bootApp } from './boot.js';

test('renders frames: the sim canvas paints non-uniform content (AC-24)', async ({ page }) => {
  await bootApp(page);
  await page.waitForTimeout(1500);
  const shot = await page.locator('#sim-canvas').screenshot();
  // A uniform (blank) canvas compresses to a few hundred bytes of PNG.
  expect(shot.length).toBeGreaterThan(5000);
});

test('worker ticks advance while running and stop while paused (AC-24)', async ({ page }) => {
  await bootApp(page);
  await expect.poll(() => page.evaluate(() => window.__VEPA_TEST__.state().tick), { timeout: 20_000 }).toBeGreaterThan(5);
  const s = await page.evaluate(() => window.__VEPA_TEST__.state());
  expect(s.workerReady).toBe(true);
  expect(s.workerFailed).toBe(false);
  await page.evaluate(() => window.__VEPA_TEST__.pause());
  await page.waitForTimeout(400);
  const t0 = await page.evaluate(() => window.__VEPA_TEST__.state().tick);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__VEPA_TEST__.state().tick)).toBe(t0);
});
