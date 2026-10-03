// SPEC-AC4 (AC-91): timeline dashboard renders, REC toggles, scrub moves the timeline.
import { test, expect } from '@playwright/test';
import { bootApp } from './boot.js';

test('timeline dashboard: renders, REC toggles, scrub moves the timeline (AC-91)', async ({ page }) => {
  await bootApp(page);
  const dash = page.locator('#intel-dashboard');
  await expect(dash.locator('.intel-header')).toHaveText('INTELLIGENCE');
  await expect(dash.locator('#intel-rec')).toHaveText('OFF');
  const rec = dash.locator('#intel-record-btn');
  // Software-rendered CI browsers tick slowly: snapshot every 5 ticks, not 150.
  await page.evaluate(() => window.__VEPA_TEST__.setTimelineInterval(5));
  await rec.dispatchEvent('click');
  await expect(dash.locator('#intel-rec')).toHaveText('ON');
  await expect(rec).toHaveText('■ STOP');
  await expect.poll(() => page.evaluate(() => Number(document.getElementById('intel-snapshots').textContent)), { timeout: 45_000, intervals: [500] }).toBeGreaterThanOrEqual(2);
  const scrub = dash.locator('#intel-scrub');
  await expect(scrub).toBeEnabled();
  // Pause and let any in-flight worker tick land before reading the tick.
  await page.evaluate(() => window.__VEPA_TEST__.pause());
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.__VEPA_TEST__.state().tick);
  await page.evaluate(() => {
    const el = document.getElementById('intel-scrub');
    el.value = '0';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const after = await page.evaluate(() => window.__VEPA_TEST__.state().tick);
  expect(after).toBeLessThan(before); // jumped back to the first snapshot
  await expect(dash.locator('#intel-goal-log')).toContainText('timeline scrubbed');
  await rec.dispatchEvent('click');
  await expect(dash.locator('#intel-rec')).toHaveText('OFF');
});
