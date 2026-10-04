// B7 (D-006): the civilisation runtime adapter in the real app — off by
// default, and when enabled it builds kin/household/polity records live that
// survive a save → export → import → restore.
import { test, expect } from '@playwright/test';
import { bootApp } from './boot.js';

test('civilisation runtime adapter: off by default, live when enabled, survives save/restore', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await bootApp(page, '/');
  expect(await page.evaluate(() => window.__VEPA_TEST__.civReport())).toBe(null);
  await page.evaluate(() => { window.__VEPA_TEST__.setLaw('LIFE', true); window.__VEPA_TEST__.setLaw('REPRO', true); window.__VEPA_TEST__.civEnable(true); });
  await expect.poll(() => page.evaluate(() => window.__VEPA_TEST__.civReport()?.steps || 0), { timeout: 60_000 }).toBeGreaterThan(3);
  const before = await page.evaluate(() => window.__VEPA_TEST__.civReport());
  expect(before.regime).toBeTruthy();
  await page.evaluate(() => window.__VEPA_TEST__.pause());
  const snap = await page.evaluate(() => window.__VEPA_TEST__.civReport());
  expect(await page.evaluate(() => window.__VEPA_TEST__.saveRoundTrip())).toBe(true);
  const after = await page.evaluate(() => window.__VEPA_TEST__.civReport());
  expect(after.stats).toEqual(snap.stats);
  expect(after.relations).toEqual(snap.relations);
  expect(after.households).toBe(snap.households);
  expect(after.polities).toBe(snap.polities);
  expect(errors).toEqual([]);
});
