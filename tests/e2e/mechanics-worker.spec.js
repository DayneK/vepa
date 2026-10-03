// MCM-2 (AC-25): a Mechanics law toggle produces a measurable worker-state change.
import { test, expect } from '@playwright/test';
import { bootApp } from './boot.js';

test('toggling the CONTACT mechanics law changes worker particle state (AC-25)', async ({ page }) => {
  await bootApp(page);
  await expect.poll(() => page.evaluate(() => window.__VEPA_TEST__.state().tick), { timeout: 20_000 }).toBeGreaterThan(5);
  const N = 200;
  const run = async (contactOn) => page.evaluate(async ({ N, contactOn }) => {
    const T = window.__VEPA_TEST__;
    T.pause();
    await new Promise((r) => setTimeout(r, 300));
    for (const law of ['COLL', 'ACCR']) T.setLaw(law, false);
    T.setLaw('CONTACT', contactOn);
    await new Promise((r) => setTimeout(r, 200));
    T.stagePairs(N);
    const before = T.pairSeparation(N);
    const tick0 = T.state().tick;
    T.resume();
    const t0 = performance.now();
    while (T.state().tick < tick0 + 10 && performance.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
    T.pause();
    await new Promise((r) => setTimeout(r, 300));
    return { before, after: T.pairSeparation(N), ticks: T.state().tick - tick0 };
  }, { N, contactOn });
  const off = await run(false);
  const on = await run(true);
  test.info().annotations.push({ type: 'contact', description: JSON.stringify({ off, on }) });
  expect(off.ticks).toBeGreaterThanOrEqual(10);
  expect(on.ticks).toBeGreaterThanOrEqual(10);
  expect(on.before).toBeLessThan(0.1);
  // CONTACT pushes the staged overlapping pairs apart; without it they stay close.
  expect(on.after).toBeGreaterThan(off.after + 0.3);
});
