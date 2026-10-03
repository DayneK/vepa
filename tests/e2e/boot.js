// Shared e2e boot helper: the launch modal blocks boot until answered, so
// accept the defaults, then wait until the app (incl. multiplex controller,
// created last in boot) is up.
import { expect } from '@playwright/test';

export async function bootApp(page, path = './') {
  await page.goto(path);
  const launch = page.locator('.launch-primary');
  await launch.waitFor({ state: 'visible', timeout: 15_000 }).then(() => launch.click()).catch(() => {});
  await expect(page.locator('#sim-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__VEPA_DEBUG__?._active) && typeof window.openChaosMultiplex === 'function', null, { timeout: 45_000 });
}
