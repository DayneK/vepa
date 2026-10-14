import { test, expect } from '@playwright/test';

const FUTURE_GATES = Object.freeze({
  '00': 'mobile visual and starter-world parity baseline',
  '01': 'full session command ownership and composition registry',
  '02': 'GPU-rendered 3D parity and Easy/Advanced UX',
  '03': 'all physics settings in atomic restart-only recipes',
  '04': 'all genome and roster operations staged before restart',
  '05': 'all 136 law entry points validated with fidelity evidence',
  '06': 'representative reproducible performance and accuracy matrix',
  '07': 'provider-neutral remote execution, ordering, security and recovery',
  '08': 'roadmap-selected GPU 3D with explicit fallback acceptance',
  '09': 'versioned complete-state migration and deterministic replay',
  '10': 'bounded deterministic engines with isolated save/restore contracts',
  '11': 'manifest-driven module contracts, isolation and rollback gates',
});

async function openRuntime(page) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#sim-canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__VEPA_DEBUG__?._active));
  const launchOverlay = page.locator('#launch-overlay');
  await expect.poll(() => page.evaluate(() => Boolean(
    document.querySelector('#launch-overlay') || document.querySelector('#law-grid')?.children.length,
  ))).toBe(true);
  if (await launchOverlay.count()) {
    await expect(launchOverlay).toBeVisible();
    await launchOverlay.locator('[data-act="launch"]').click();
    await expect(launchOverlay).toHaveCount(0);
  }
  await expect(page.locator('#law-grid .sq-toggle, #law-grid .law-btn').first()).toBeAttached();
  await expect.poll(() => page.locator('#hud-particles').getAttribute('aria-label')).not.toBe('Particle population loading');
  await expect.poll(() => page.locator('#hud-tick').getAttribute('aria-label')).toMatch(/Tick [1-9]\d*,/);
  expect(pageErrors, 'application boot should not produce uncaught page errors').toEqual([]);
}

async function openTab(page, tabId) {
  await page.locator(`#main-panel .tab-btn[data-tab="${tabId}"]`).click();
  await expect(page.locator(`#${tabId}`)).toHaveClass(/active/);
}

async function openSubtab(page, subId) {
  await page.locator(`#main-panel .sub-tab-btn[data-sub="${subId}"]`).click();
  await expect(page.locator(`#${subId}`)).toHaveClass(/active/);
}

test.describe('RB 00–11 browser stage matrix', () => {
  test.beforeEach(async ({ page }) => {
    await openRuntime(page);
  });

  test('RB-00 current program baseline: page shell and visible controls', async ({ page }) => {
    await expect(page.locator('body')).toHaveClass(/theme-sanguine/);
    await expect(page.locator('#sim-canvas')).toBeVisible();
    await expect(page.locator('#bg-canvas')).toBeAttached();
    await expect(page.locator('#play-pause-btn')).toBeVisible();
    await expect(page.locator('#hud-species')).not.toContainText('loading');
    await expect(page.locator('#hud-tick')).toBeVisible();
    await expect(page.locator('#main-panel .tab-btn[data-tab]')).toHaveCount(3);
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['00'] });
  });

  test('RB-01 shell/orchestrator: startup, pause/resume and restart lifecycle', async ({ page }) => {
    await page.locator('#play-pause-btn').click();
    await expect(page.locator('#play-pause-btn')).toContainText('▶');
    const pausedLabel = await page.locator('#hud-tick').getAttribute('aria-label');
    const pausedTick = pausedLabel.match(/Tick (\d+),/)?.[1];
    expect(pausedTick).toBeTruthy();
    await page.waitForTimeout(1_100);
    const afterPauseLabel = await page.locator('#hud-tick').getAttribute('aria-label');
    expect(afterPauseLabel.match(/Tick (\d+),/)?.[1]).toBe(pausedTick);
    await page.locator('#play-pause-btn').click();
    await expect(page.locator('#play-pause-btn')).toContainText('⏸');
    await page.locator('#restart-btn').click();
    await expect(page.locator('#vepa-debug-body')).toContainText('simulation restarted');
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['01'] });
  });

  test('RB-02 visual shell/UI: top-level and nested drawer navigation', async ({ page }) => {
    const tab = page.locator('#main-panel .tab-btn[data-tab="tab-data"]');
    await tab.click();
    await expect(page.locator('#tab-data')).toHaveClass(/active/);
    await openSubtab(page, 'data-dna');
    await expect(page.locator('#dna-analytics')).toBeAttached();
    await tab.focus();
    await tab.press('ArrowLeft');
    await expect(page.locator('#tab-saves')).toHaveClass(/active/);
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['02'] });
  });

  test('RB-03 world parameters: slider edits appear as pending and can be discarded', async ({ page }) => {
    await openSubtab(page, 'setup-world');
    const control = page.locator('#world-params .sc-row[data-key="WORLD_SIZE"] .sc-input');
    await expect(control).toBeVisible();
    await control.focus();
    await control.press('ArrowRight');
    const pendingStatus = page.locator('#setup-world [data-pending-status]');
    await expect(pendingStatus).toContainText('pending');
    await page.locator('#setup-world [data-pending-discard]').click();
    await expect(pendingStatus).toContainText('No staged world changes');
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['03'] });
  });

  test('RB-04 species/genome: roster and DNA editor expose the current 64 traits', async ({ page }) => {
    await openSubtab(page, 'setup-species');
    await expect(page.locator('#species-list .species-card')).toHaveCount(5);
    const traitSlots = page.locator('#dna-accordion .sc-row[data-key]');
    await expect(traitSlots).toHaveCount(64);
    const force = page.locator('#dna-accordion .sc-row[data-key="0"] .sc-input');
    await expect(force).toBeVisible();
    const sliderPosition = Number(await force.inputValue());
    await force.focus();
    await force.press(sliderPosition >= 1000 ? 'ArrowLeft' : 'ArrowRight');
    // The DNA notice is mounted beside WORLD controls, so switch there to
    // verify/discard the proposal through the visible UI.
    await openSubtab(page, 'setup-world');
    const pendingStatus = page.locator('#setup-world [data-dna-pending-status]');
    await expect(pendingStatus).toContainText('pending');
    await page.locator('#setup-world [data-dna-pending-discard]').click();
    await expect(pendingStatus).toContainText('No staged DNA changes');
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['04'] });
  });

  test('RB-05 laws/fidelity: declared law grid, search and staged toggles', async ({ page }) => {
    const lawCount = await page.locator('#law-grid [data-law]').count();
    expect(lawCount).toBe(136);
    const contact = page.locator('#law-grid [data-name="contact"]');
    await expect(contact).toBeAttached();
    await page.locator('#law-search').fill('contact');
    await expect(contact).toBeVisible();
    await contact.click();
    const pendingStatus = page.locator('#setup-laws [data-law-pending-status]');
    await expect(pendingStatus).toContainText('pending');
    await expect(contact).toHaveClass(/pending-law/);
    await page.locator('#setup-laws [data-law-pending-discard]').click();
    await expect(pendingStatus).toContainText('No staged law changes');
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['05'] });
  });

  test('RB-06 physics/performance: actual compute ticks advance and telemetry is finite', async ({ page }) => {
    await expect.poll(() => page.locator('#hud-tick').getAttribute('aria-label')).toMatch(/Tick [1-9]\d*,/);
    await expect(page.locator('#vepa-debug-stats')).toBeAttached();
    await expect.poll(() => page.locator('#vepa-debug-stats').innerText()).toMatch(/fps:\d+ tick:\d+ n:\d+ sp:\d+ laws:\d+/);
    expect(await page.evaluate(() => [document.querySelector('#sim-canvas').width, document.querySelector('#sim-canvas').height].every((dimension) => dimension > 0))).toBe(true);
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['06'] });
  });

  test('RB-07 execution/cloud: report actual local isolation and fallback capabilities', async ({ page }) => {
    const execution = await page.evaluate(() => ({
      isolated: globalThis.crossOriginIsolated,
      sharedArrayBuffer: typeof globalThis.SharedArrayBuffer === 'function',
      renderer: window.__VEPA_RENDERER__?.mode || null,
      webgpuApi: Boolean(navigator.gpu),
    }));
    expect(execution.isolated).toBe(true);
    expect(execution.sharedArrayBuffer).toBe(true);
    expect(['canvas2d', 'pixi']).toContain(execution.renderer);
    test.info().annotations.push({ type: 'current-execution', description: JSON.stringify(execution) });
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['07'] });
  });

  test('RB-08 rendering: selected browser renderer is live and canvases resize', async ({ page }) => {
    const before = await page.evaluate(() => ({
      mode: window.__VEPA_RENDERER__?.mode,
      canvas: [document.querySelector('#sim-canvas').width, document.querySelector('#sim-canvas').height],
      width: window.__VEPA_RENDERER__?.width,
      height: window.__VEPA_RENDERER__?.height,
    }));
    expect(['canvas2d', 'pixi']).toContain(before.mode);
    expect(before.width).toBeGreaterThan(0);
    expect(before.height).toBeGreaterThan(0);
    await page.setViewportSize({ width: 900, height: 700 });
    await expect.poll(() => page.evaluate(() => [
      window.__VEPA_RENDERER__?.width,
      window.__VEPA_RENDERER__?.height,
    ])).not.toEqual([before.width, before.height]);
    await expect(page.locator('#sim-canvas')).toBeVisible();
    const after = await page.evaluate(() => [window.__VEPA_RENDERER__?.width, window.__VEPA_RENDERER__?.height]);
    expect(after[0]).not.toBe(before.width);
    expect(after[1]).not.toBe(before.height);
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['08'] });
  });

  test('RB-09 state/presets: save, list and undo surfaces are mounted', async ({ page }) => {
    await openTab(page, 'tab-saves');
    await openSubtab(page, 'saves-states');
    await expect(page.locator('#ws-name')).toBeVisible();
    await expect(page.locator('#ws-save')).toBeVisible();
    const saveName = `RB browser stage ${Date.now()}`;
    await page.locator('#ws-name').fill(saveName);
    await page.locator('#ws-save').click();
    await expect(page.locator('#ws-status')).toContainText('Saved', { timeout: 15_000 });
    await expect(page.locator('#ws-list')).toContainText(saveName);
    await openSubtab(page, 'saves-undo');
    await expect(page.locator('#ws-ring-depth')).toBeVisible();
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['09'] });
  });

  test('RB-10 emergent systems/observability: data panels expose populated projections', async ({ page }) => {
    await openTab(page, 'tab-data');
    await expect(page.locator('#data-intel')).toHaveClass(/active/);
    await expect(page.locator('#hud-particles')).toHaveAttribute('aria-label', /particles alive/i);
    await openSubtab(page, 'data-eco');
    await expect(page.locator('#eco-dashboard')).toBeAttached();
    await expect(page.locator('#eco-dashboard .intel-header')).toHaveText('ECOSYSTEM');
    await expect.poll(() => page.locator('#eco-pop').innerText()).toMatch(/[1-9]\d*/);
    await openSubtab(page, 'data-logs');
    await expect(page.locator('#narrative-panel #narrative-scroll')).toBeAttached();
    await expect(page.locator('#narrative-panel #narrative-search')).toBeAttached();
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['10'] });
  });

  test('RB-11 module/package integration: app assets, worker and module shell are reachable', async ({ page, request }) => {
    const shellResponse = await request.get('/');
    expect(shellResponse.ok()).toBe(true);
    expect(shellResponse.headers()['cross-origin-opener-policy']).toBe('same-origin');
    expect(shellResponse.headers()['cross-origin-embedder-policy']).toBe('require-corp');
    const workerResponse = await request.get('/src/worker/physics.worker.js');
    expect(workerResponse.ok()).toBe(true);
    await expect(page.locator('#react-root')).toBeAttached();
    await expect(page.locator('#law-grid [data-law]')).toHaveCount(136);
    const packageAssets = await page.evaluate(() => ({
      script: [...document.scripts].some((script) => script.type === 'module' && Boolean(script.src)),
      stylesheet: [...document.styleSheets].some((sheet) => Boolean(sheet.href)),
      moduleControls: document.querySelectorAll('#main-panel [data-tab], #main-panel [data-sub]').length,
    }));
    expect(packageAssets.script).toBe(true);
    expect(packageAssets.stylesheet).toBe(true);
    expect(packageAssets.moduleControls).toBeGreaterThan(0);
    test.info().annotations.push({ type: 'future-acceptance-gate', description: FUTURE_GATES['11'] });
  });
});
