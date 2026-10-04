// ============================================================================
// D-028 — shared tab strip for settings panels (CHAOS MULTIPLEX setup screen
// and the CHAOS CONTROL menu). Pure presentation: tabs only show/hide panels
// that already hold every control, so no setting, id or default changes.
//
// Markup contract:
//   <div role="tablist"> <button role="tab" data-tab="x" aria-controls="..."> …
//   <div role="tabpanel" data-tab="x" [hidden]> …
// ============================================================================

/**
 * Activate one tab inside `root` (by its data-tab id). Unknown ids are ignored.
 * @returns {string|null} the active tab id
 */
export function activateSettingsTab(root, id) {
  if (!root) return null;
  const tabs = [...root.querySelectorAll('[role="tab"][data-tab]')];
  if (!tabs.some((t) => t.dataset.tab === id)) return null;
  for (const t of tabs) {
    const on = t.dataset.tab === id;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  }
  for (const p of root.querySelectorAll('[role="tabpanel"][data-tab]')) {
    p.hidden = p.dataset.tab !== id;
  }
  return id;
}

/**
 * Wire click + arrow-key navigation for every tab in `root`.
 * @param {(id: string) => void} [onChange] called after a tab is activated
 */
export function wireSettingsTabs(root, onChange) {
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"][data-tab]')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      activateSettingsTab(root, tab.dataset.tab);
      if (onChange) onChange(tab.dataset.tab);
    });
    tab.addEventListener('keydown', (e) => {
      let next = -1;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      activateSettingsTab(root, tabs[next].dataset.tab);
      tabs[next].focus();
      if (onChange) onChange(tabs[next].dataset.tab);
    });
  });
  const active = tabs.find((t) => t.classList.contains('active')) || tabs[0];
  if (active) activateSettingsTab(root, active.dataset.tab);
}
