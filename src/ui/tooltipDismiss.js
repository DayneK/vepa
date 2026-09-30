/**
 * VEPA4 — Tooltip dismissal bus.
 *
 * The drawer has several independent tooltip systems (parameter help, graph
 * help, the chaos-multiplex help, the help drone). Each previously decided for
 * itself when to hide, which produced three different rules and a tooltip you
 * could not get rid of without knowing which system owned it.
 *
 * One rule now: a press anywhere dismisses every open tooltip. A tooltip may
 * declare itself press-insensitive, in which case that press is ignored and
 * only an explicit close dismisses it — used by the parameter popup, which is
 * large enough to read and must survive the pointerup that ends its long press.
 *
 * Installed lazily on the first registration so importing this module has no
 * side effect in tests or in a headless import.
 */

/** @type {Set<{name: string, dismiss: Function, pressInsensitive: boolean}>} */
const registry = new Set();
let installedOn = null;

function isInside(entry, node) {
  if (!node || !entry.anchor) return false;
  if (entry.anchor === node) return true;
  return typeof entry.anchor.contains === 'function' && entry.anchor.contains(node);
}

function onPressDown(event) {
  // Snapshot first: a dismiss() may unregister itself mid-iteration.
  for (const entry of [...registry]) {
    if (entry.pressInsensitive) continue;
    // A press on a tooltip's own anchor must not make it vanish under the
    // finger that is about to re-open it.
    if (isInside(entry, event.target)) continue;
    entry.dismiss();
  }
}

function install() {
  if (typeof document === 'undefined') return;
  // Keyed on the document itself, not a boolean: the guard's job is to add one
  // listener pair per document, and a stale flag would silently leave a new
  // document unwired.
  if (installedOn === document) return;
  document.addEventListener('pointerdown', onPressDown, true);
  document.addEventListener('contextmenu', () => {
    for (const entry of [...registry]) entry.dismiss();
  }, true);
  installedOn = document;
}

/**
 * Register a tooltip so a press elsewhere dismisses it.
 *
 * @param {object} entry
 * @param {string} entry.name           unique id, used to avoid self-dismissal
 * @param {Function} entry.dismiss      hide callback
 * @param {HTMLElement} [entry.anchor]  element the tooltip is anchored to; a
 *                                      press inside it will not dismiss it
 * @param {boolean} [entry.pressInsensitive] survive every press; the caller
 *                                      must then provide its own close affordance
 * @returns {Function} unregister
 */
export function registerTooltip(entry) {
  if (!entry || typeof entry.dismiss !== 'function') {
    throw new TypeError('registerTooltip requires a dismiss function');
  }
  install();
  const record = {
    name: entry.name || 'tooltip',
    dismiss: entry.dismiss,
    anchor: entry.anchor || null,
    pressInsensitive: entry.pressInsensitive === true,
  };
  registry.add(record);
  return () => registry.delete(record);
}

/** Dismiss every registered tooltip, optionally sparing one by name. */
export function dismissTooltips(exceptName = null) {
  for (const entry of [...registry]) {
    if (exceptName && entry.name === exceptName) continue;
    entry.dismiss();
  }
}

/** True when a tooltip with this name is currently registered. */
export function isTooltipRegistered(name) {
  for (const entry of registry) if (entry.name === name) return true;
  return false;
}

/** Names of all registered tooltips. Test seam. */
export function registeredTooltips() {
  return [...registry].map((e) => e.name);
}

/** Tear down the bus. Test seam only. */
export function resetTooltipDismiss() {
  registry.clear();
  installedOn = null;
}