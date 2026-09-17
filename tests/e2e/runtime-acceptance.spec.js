import { test, expect } from '@playwright/test';

async function openRuntime(page) {
  await page.goto('./');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
}

test.describe('VEPA browser acceptance boundary', () => {
  test('boots the real application with cross-origin isolation', async ({ page }) => {
    await openRuntime(page);
    expect(await page.evaluate(() => ({
      isolated: globalThis.crossOriginIsolated,
      sharedArrayBuffer: typeof globalThis.SharedArrayBuffer === 'function',
      canvasCount: document.querySelectorAll('canvas').length,
    }))).toMatchObject({ isolated: true, sharedArrayBuffer: true });
  });

  test('renders all eight Mechanics law toggles and toggles CONTACT in the browser', async ({ page }) => {
    await openRuntime(page);
    const mechanics = page.locator('.law-btn[data-law="128"], .law-btn[data-law="129"], .law-btn[data-law="130"], .law-btn[data-law="131"], .law-btn[data-law="132"], .law-btn[data-law="133"], .law-btn[data-law="134"], .law-btn[data-law="135"]');
    await expect(mechanics).toHaveCount(8);

    const contact = page.locator('.law-btn[data-law="128"]');
    await expect(contact).not.toHaveClass(/active/);
    await contact.click();
    await expect(contact).toHaveClass(/active/);
    await contact.click();
    await expect(contact).not.toHaveClass(/active/);
  });

  test('reports WebGPU availability without treating fallback as GPU execution', async ({ page }) => {
    await openRuntime(page);
    const capability = await page.evaluate(async () => {
      const gpu = navigator.gpu;
      if (!gpu) return { api: false, adapter: false, device: false };
      const adapter = await gpu.requestAdapter();
      if (!adapter) return { api: true, adapter: false, device: false };
      const device = await adapter.requestDevice();
      return { api: true, adapter: true, device: Boolean(device) };
    });

    expect(capability.api).toBeTypeOf('boolean');
    test.info().annotations.push({
      type: 'webgpu',
      description: capability.device ? 'WebGPU device available in this browser run.' : 'No WebGPU device; CPU fallback remains the only verified path.',
    });
  });
});
