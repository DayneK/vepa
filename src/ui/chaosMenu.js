// ============================================================================
// CHAOS CONTROL menu (long-press the CHAOS button). D-028: split into tabs
// with plain-language help. Behaviour is unchanged: the same bus events fire
// (sim:chaos, sim:chaosSelective, sim:chaosClear) and the same five categories
// are checked by default. The four categories the old menu never offered
// (mechanics, electromagnetism, information, quantum) are now listed but start
// unchecked, so RANDOMIZE SELECTED does exactly what it did unless you opt in.
// ============================================================================
import { LAW_CATEGORIES } from '../constants/laws.js';
import { wireSettingsTabs } from './settingsTabs.js';

/** Category rows in display order; `checked` is the default state. */
export const CHAOS_MENU_CATEGORIES = Object.freeze([
  { id: 'physics', label: 'Physics', checked: true },
  { id: 'biology', label: 'Biology', checked: true },
  { id: 'chemistry', label: 'Chemistry', checked: true },
  { id: 'thermodynamics', label: 'Thermodynamics', checked: true },
  { id: 'metaphysics', label: 'Metaphysics', checked: true },
  { id: 'mechanics', label: 'Mechanics', checked: false },
  { id: 'electromagnetism', label: 'Electromagnetism', checked: false },
  { id: 'information', label: 'Information', checked: false },
  { id: 'quantum', label: 'Quantum', checked: false },
]);

/** Tab ids in order (first is the default). */
export const CHAOS_MENU_TABS = Object.freeze([
  { id: 'selective', label: 'SELECTIVE' },
  { id: 'multiplex', label: 'MULTIPLEX' },
  { id: 'tap', label: 'TAP CHAOS' },
]);

function lawCount(id) {
  const c = LAW_CATEGORIES[id];
  return c && Array.isArray(c.laws) ? c.laws.length : 0;
}

/** Pure HTML for the menu body (exported for tests). */
export function buildChaosMenuHTML() {
  const tabs = CHAOS_MENU_TABS.map((t, i) =>
    `<button class="settings-tab${i === 0 ? ' active' : ''}" role="tab" type="button" id="chaos-tab-${t.id}" data-tab="${t.id}" aria-selected="${i === 0}" aria-controls="chaos-panel-${t.id}">${t.label}</button>`,
  ).join('');
  const cats = CHAOS_MENU_CATEGORIES.map((c) =>
    `<label class="chaos-cat-row"><input type="checkbox" data-cat="${c.id}"${c.checked ? ' checked' : ''}><span>${c.label}</span><span class="chaos-cat-count">${lawCount(c.id)} laws</span></label>`,
  ).join('');
  return `<div class="chaos-menu-content" role="dialog" aria-label="Chaos control">
  <div class="chaos-menu-title">CHAOS CONTROL</div>
  <div class="settings-tabs" role="tablist" aria-label="Chaos settings">${tabs}</div>

  <div class="settings-tabpanel" role="tabpanel" id="chaos-panel-selective" data-tab="selective" aria-labelledby="chaos-tab-selective">
    <p class="settings-tab-intro">Re-roll only the law categories you tick. Each law in a ticked category has a 70% chance to be re-rolled, then a 50/50 chance of ending up on or off. Unticked categories are left alone.</p>
    <div class="chaos-menu-actions">
      <button class="chaos-btn-action chaos-multiplex-primary" type="button" data-action="randomize">RANDOMIZE SELECTED</button>
    </div>
    <div class="chaos-menu-bulk">
      <button class="chaos-btn-action" type="button" data-action="all">TICK ALL</button>
      <button class="chaos-btn-action" type="button" data-action="none">TICK NONE</button>
    </div>
    <div class="chaos-menu-cats">${cats}</div>
    <p class="settings-hint">CLEAR ALL LAWS switches every law off, in every category (ticked or not).</p>
    <div class="chaos-menu-actions">
      <button class="chaos-btn-action" type="button" data-action="clear">CLEAR ALL LAWS</button>
    </div>
  </div>

  <div class="settings-tabpanel" role="tabpanel" id="chaos-panel-multiplex" data-tab="multiplex" aria-labelledby="chaos-tab-multiplex" hidden>
    <p class="settings-tab-intro">Chaos Multiplex runs several varied copies of this world side by side so you can pick the future you like and iterate from it. Its own settings (grid, breeding, fitness…) open in a separate screen.</p>
    <div class="chaos-menu-actions">
      <button class="chaos-btn-action chaos-multiplex-primary" type="button" data-action="multiplex">OPEN CHAOS MULTIPLEX SETTINGS</button>
    </div>
  </div>

  <div class="settings-tabpanel" role="tabpanel" id="chaos-panel-tap" data-tab="tap" aria-labelledby="chaos-tab-tap" hidden>
    <p class="settings-tab-intro">A quick tap on the CHAOS button scrambles the whole rule set: every law is switched off, the laws are shuffled into 3–5 groups, each group has a 70% chance to switch on (40–100% of its laws), and about 15% of each species' first 42 DNA values are re-rolled. There are no settings for the tap. Hold the button to open this menu.</p>
    <div class="chaos-menu-actions">
      <button class="chaos-btn-action" type="button" data-action="tap">RUN TAP CHAOS NOW</button>
    </div>
  </div>

  <div class="chaos-menu-actions chaos-menu-footer">
    <button class="chaos-btn-action" type="button" data-action="close">CLOSE</button>
  </div>
</div>`;
}

/** Open the menu (replacing any open copy). */
export function showChaosMenu(bus) {
  const old = document.getElementById('chaos-menu');
  if (old) old.remove();
  const menu = document.createElement('div');
  menu.id = 'chaos-menu';
  menu.className = 'chaos-menu';
  menu.innerHTML = buildChaosMenuHTML();
  document.body.appendChild(menu);
  wireSettingsTabs(menu.querySelector('.chaos-menu-content'));
  const boxes = () => menu.querySelectorAll('input[type="checkbox"][data-cat]');
  menu.querySelectorAll('.chaos-btn-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'close') { menu.remove(); return; }
      if (action === 'all' || action === 'none') {
        boxes().forEach((cb) => { cb.checked = action === 'all'; });
        return;
      }
      if (action === 'multiplex') {
        menu.remove();
        if (typeof window.openChaosMultiplex === 'function') window.openChaosMultiplex();
        return;
      }
      if (action === 'tap') { bus.emit('sim:chaos'); menu.remove(); return; }
      if (action === 'clear') { bus.emit('sim:chaosClear'); menu.remove(); return; }
      if (action === 'randomize') {
        const checked = [];
        boxes().forEach((cb) => { if (cb.checked) checked.push(cb.dataset.cat); });
        bus.emit('sim:chaosSelective', { categories: checked });
        menu.remove();
      }
    });
  });
  menu.addEventListener('click', (e) => {
    if (e.target === menu) menu.remove();
  });
  return menu;
}
