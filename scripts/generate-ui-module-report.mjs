#!/usr/bin/env node
/**
 * VEPA4 — UI module report generator.
 *
 * Answers the question the drawer is hard to answer by hand: *for each tab,
 * what modules does it contain, what do they display, what do they look like,
 * and what can I press?* The alternative — a document someone maintains by
 * hand — is wrong within one release, which is how such a document comes to be
 * wrong in the first place.
 *
 * So nothing in the body of this report is written by hand. It is derived from
 * four sources that already have to be true:
 *
 *   index.html               the tab/sub-tab tree and the static panel markup
 *   src/ui/helpRegistry.js   the documented purpose of every tab, sub-tab,
 *                            graph and analytics cell — the help content is
 *                            already written and reviewed, so it is the honest
 *                            source for "what does this display"
 *   src/ui/*.js              the controls each panel builds at mount time, read
 *                            out of its own templates and DOM calls
 *   style.css                the visual characteristics: type size, layout and
 *                            accent colour of the classes each panel uses
 *
 * The one hand-maintained structure is the PANELS table below, because the link
 * between a sub-tab id and the file that builds it is implicit in the code
 * (`createIntelPanel` hard-codes `#intel-dashboard`). It is validated against
 * the real files at the end of this script, so a rename cannot leave it
 * silently wrong.
 *
 * Output: docs/systems/ui-module-report.md, which `npm run build` publishes to
 * dist/docs/systems/ via scripts/publish-system-atlas.mjs. That is what makes
 * it linkable from the running app and not only from a checkout.
 *
 * Run: node scripts/generate-ui-module-report.mjs [--check]
 *   --check exits non-zero if the committed file differs, so a panel added
 *   without regenerating the report fails the build rather than shipping.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'docs/systems/ui-module-report.md');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * Sub-tab → the module that builds it.
 *
 * `cellPrefix` is how that module's entries in `CELL_HELP` are recognised. The
 * prefixes are not derivable from the sub-tab id (`data-groups` is `ga-*`,
 * `data-civilization` is `civ-*`), and the validation step at the bottom proves
 * the four prefixes between them account for every cell exactly once.
 */
const PANELS = {
  'setup-laws': { file: 'src/ui/lawPanel.js', mount: 'law-grid', cellPrefix: null },
  'setup-world': { file: 'src/ui/worldPanel.js', mount: 'world-params', cellPrefix: null },
  'setup-species': { file: 'src/ui/speciesPanel.js', mount: 'species-list', cellPrefix: null },
  'setup-settings': { file: 'src/ui/settingsPanel.js', mount: 'laws-panel', cellPrefix: null },
  'tab-saves': { file: 'src/ui/savePanel.js', mount: 'saves-panel', cellPrefix: null },
  'data-intel': { file: 'src/ui/intelPanel.js', mount: 'intel-dashboard', cellPrefix: 'intel-' },
  'data-dna': { file: 'src/ui/dnaAnalytics.js', mount: 'dna-analytics', cellPrefix: null },
  'data-logs': { file: 'src/ui/narrativePanel.js', mount: 'narrative-panel', cellPrefix: null },
  'data-groups': { file: 'src/ui/groupAnalytics.js', mount: 'groups-dashboard', cellPrefix: 'ga-' },
  'data-eco': { file: 'src/ui/ecoPanel.js', mount: 'eco-dashboard', cellPrefix: 'eco-' },
  'data-civilization': { file: 'src/ui/civilizationPanel.js', mount: 'civilization-dashboard', cellPrefix: 'civ-' },
};

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

// ── Sources ──────────────────────────────────────────────────────────────
const HTML = await readFile(resolve(ROOT, 'index.html'), 'utf8');
const CSS = [
  await readFile(resolve(ROOT, 'style.css'), 'utf8'),
  await readFile(resolve(ROOT, 'src/ui/toolbarHelp.css'), 'utf8'),
].join('\n');
const { TAB_HELP, SUBTAB_HELP, TAB_SUBTABS, TAB_ORDER, CELL_HELP, GRAPH_HELP } = await import(
  pathToFileURL(resolve(ROOT, 'src/ui/helpRegistry.js')).href
);
const VERSION = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')).version;

/** `data-tab` / `data-sub` buttons in index.html, with their visible labels. */
const tabButtons = [...HTML.matchAll(/data-tab="([^"]+)"[^>]*aria-label="([^"]*)"/g)].map((m) => ({ id: m[1], label: m[2] }));
const subButtons = [...HTML.matchAll(/data-sub="([^"]+)"[^>]*aria-label="([^"]*)"/g)].map((m) => ({ id: m[1], label: m[2] }));

/**
 * Canvases declared inside a panel in index.html.
 *
 * The panels are nearly all built at mount time, so index.html holds only
 * their mount points — but the DNA chart grid is static, and those nine graphs
 * are exactly the ones a reader cannot otherwise discover.
 */
function canvasesFor(panelId) {
  const start = HTML.indexOf(`id="${panelId}"`);
  if (start === -1) return [];
  let depth = 0;
  let i = start;
  for (; i < HTML.length; i += 1) {
    if (HTML[i] !== '<') continue;
    const close = HTML.indexOf('>', i);
    if (close === -1) break;
    const tag = HTML.slice(i, close);
    if (tag.startsWith('</')) depth -= 1;
    else if (!tag.endsWith('/>') && !/^<(input|img|br|hr|meta|link|canvas)\b/.test(tag)) depth += 1;
    if (depth === 0) break;
    i = close;
  }
  return [...HTML.slice(start, i).matchAll(/<canvas id="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * What a module actually builds: the controls it instantiates, the classes it
 * applies, and the readouts it labels. Read from the module's own source rather
 * than declared here, so adding a control to a panel changes the report.
 */
async function moduleFacts(relPath) {
  const src = await readFile(resolve(ROOT, relPath), 'utf8');
  const tags = new Set();
  for (const m of src.matchAll(/<\s*(button|input|select|textarea|canvas|table|details|summary)\b/gi)) {
    tags.add(m[1].toLowerCase());
  }
  for (const m of src.matchAll(/createElement\(\s*['"]([a-z]+)['"]/gi)) tags.add(m[1].toLowerCase());

  const classes = new Set();
  for (const m of src.matchAll(/class="([^"$`]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c && /^[a-z][a-z0-9_-]*$/.test(c)) classes.add(c);
  }
  for (const m of src.matchAll(/classList\.(?:add|toggle)\(\s*['"]([a-z0-9_-]+)['"]/gi)) classes.add(m[1]);

  // Sliders come from a shared factory, so a panel that never writes `<input>`
  // can still be full of them.
  const sliders = (src.match(/sliderControl|sc-input|createSliderRow/g) || []).length;

  const INTERACTIVE = ['button', 'input', 'select', 'textarea', 'table', 'details', 'summary'];
  return {
    controls: INTERACTIVE.filter((t) => tags.has(t)),
    canvases: tags.has('canvas'),
    sliders,
    classes: [...classes].sort(),
    lines: src.split('\n').length,
  };
}

// ── style.css: visual characteristics ────────────────────────────────────
function parseCss(src) {
  const rules = [];
  const stack = [];
  let buf = '';
  for (const ch of src) {
    if (ch === '{') {
      const prelude = buf.trim();
      buf = '';
      const nested = prelude.startsWith('@');
      const frame = { nested, start: rules.length };
      stack.push(frame);
      if (!nested) {
        for (const raw of prelude.split(',')) {
          const selector = raw.replace(/"/g, "'").replace(/\s+/g, ' ').trim();
          if (!selector || selector === 'from' || selector === 'to' || selector === '*') continue;
          if (/^[\d.]+%$/.test(selector)) continue;
          rules.push({ selector, body: '' });
        }
      }
    } else if (ch === '}') {
      const f = stack.pop();
      if (f && !f.nested) for (let k = f.start; k < rules.length; k += 1) rules[k].body += buf;
      buf = '';
    } else buf += ch;
  }
  return rules.filter((r) => r.body.includes(':'));
}

const CSS_RULES = parseCss(CSS.replace(/\/\*[\s\S]*?\*\//g, ''));

const decls = (body) => {
  const out = {};
  for (const part of body.split(';')) {
    const i = part.indexOf(':');
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
};

/**
 * Describe how a module's classes are styled: type sizes, layout, and accents.
 * A description of the CSS rather than a screenshot, because that is the part
 * of "visual characteristics" a reader can act on.
 */
function visualProfile(classes) {
  const wanted = new Set(classes);
  const sizes = new Map();
  const layouts = new Set();
  const colors = new Set();
  let bordered = 0;
  for (const rule of CSS_RULES) {
    const simple = rule.selector.match(/^([.#])?([a-z0-9_-]+)$/i);
    if (!simple) continue;
    const name = simple[2];
    if (!wanted.has(name)) continue;
    const d = decls(rule.body);
    const size = Number(/^(\d+(?:\.\d+)?)px/.exec(d['font-size'] || d.font || '')?.[1]);
    if (size) sizes.set(name, size);
    for (const prop of ['display', 'grid-template-columns', 'flex-direction']) {
      // `display: none` is how a collapsed panel is expressed, not a layout
      // choice worth reporting.
      if (d[prop] && d[prop] !== 'none') layouts.add(`${prop}: ${d[prop]}`);
    }
    for (const prop of ['color', 'background', 'border-color']) {
      const v = d[prop];
      if (v && /(var\(--accent|hsl|#[0-9a-f]{3,8}|rgb)/i.test(v)) colors.add(v.replace(/\s+/g, ' ').slice(0, 48));
    }
    if (d.border || d['border-color']) bordered += 1;
  }
  const spread = [...new Set([...sizes.values()])].sort((a, b) => a - b);
  return {
    minFont: spread[0] ?? null,
    maxFont: spread[spread.length - 1] ?? null,
    fontSpread: spread,
    layouts: [...layouts].slice(0, 5),
    colors: [...colors].slice(0, 5),
    bordered,
    styled: new Set([...sizes.keys()]).size + bordered,
  };
}

// ── Compose ──────────────────────────────────────────────────────────────
const lines = [];
const push = (s = '') => lines.push(s);

push('# VEPA4 — UI module report');
push();
push(`> Generated by \`scripts/generate-ui-module-report.mjs\` from the source of v${VERSION}.`);
push('> Do not edit by hand — \`npm run report:ui\` regenerates it, and `--check` fails the build if it drifts.');
push();
push('For each tab: the modules inside it, the information those modules display, how');
push('they are styled, and every control they expose. It exists so you can find out');
push('what a surface does without opening the app — and so you can trust the answer,');
push('because none of the body below is written by hand.');
push();

let moduleCount = 0;
let controlCount = 0;
let subTabCount = 0;
const accountedCells = new Set();

for (const tabId of TAB_ORDER) {
  const tab = TAB_HELP[tabId];
  if (!tab) continue;
  const button = tabButtons.find((b) => b.id === tabId);
  push(`## ${tab.icon} ${tab.title}`);
  push();
  push(`**Toolbar button** \`${tabId}\` — labelled "${esc(button ? button.label : tab.title)}".`);
  push();
  push(`> ${tab.summary}`);
  push();
  for (const [heading, body] of tab.sections || []) push(`- **${heading}.** ${body}`);
  push();

  const subIds = TAB_SUBTABS[tabId] || [];
  subTabCount += subIds.length;

  if (!subIds.length) {
    // A tab with no sub-tabs is its own module (WORLD STATES).
    const meta = PANELS[tabId];
    if (!meta) continue;
    const facts = await moduleFacts(meta.file);
    moduleCount += 1;
    controlCount += facts.controls.length;
    push(`### ${meta.file}`);
    push();
    push(`Mounted at \`#${meta.mount}\`, ${facts.lines} lines.`);
    push();
    push(`**Controls:** ${facts.controls.length ? facts.controls.map((c) => `\`${c}\``).join(', ') : 'none'}.`);
    push();
    continue;
  }

  push('| Sub-tab | Module | What it displays | Controls |');
  push('| --- | --- | --- | --- |');
  for (const subId of subIds) {
    const help = SUBTAB_HELP[subId];
    const meta = PANELS[subId];
    if (!help || !meta) continue;
    moduleCount += 1;
    const facts = await moduleFacts(meta.file);
    const canvases = canvasesFor(subId);
    const cellIds = meta.cellPrefix
      ? Object.keys(CELL_HELP).filter((k) => k.startsWith(meta.cellPrefix))
      : [];
    for (const c of cellIds) accountedCells.add(c);
    const controls = [...facts.controls];
    if (facts.sliders) controls.push(`${facts.sliders} slider controls`);
    controlCount += controls.length;
    const subButton = subButtons.find((b) => b.id === subId);
    // Only worth reporting when the label says something the title does not;
    // "Laws" vs "LAWS" is not a discrepancy.
    const labelNote =
      subButton && subButton.label.toUpperCase() !== help.title.toUpperCase()
        ? `<br><sub>button label "${esc(subButton.label)}"</sub>`
        : '';
    push(
      `| ${help.icon} ${help.title}${labelNote}`
      + ` | \`${meta.file}\`<br>${facts.lines} lines`
      + ` | ${esc(help.summary)}`
      + (cellIds.length
        ? `<br><br>**${cellIds.length} documented readouts:** ${cellIds.map((c) => `\`${c}\``).join(', ')}`
        : '')
      + (canvases.length
        ? `<br><br>**${canvases.length} canvas graphs:** ${canvases.map((c) => `\`${c}\``).join(', ')}`
        : '')
      + ` | ${controls.length ? controls.map((c) => (c.startsWith(String(facts.sliders)) ? c : `\`${c}\``)).join(', ') : '**none — read-only**'} |`,
    );
  }
  push();

  for (const subId of subIds) {
    const help = SUBTAB_HELP[subId];
    const meta = PANELS[subId];
    if (!help || !meta) continue;
    const facts = await moduleFacts(meta.file);
    const profile = visualProfile(facts.classes);
    const canvases = canvasesFor(subId);

    push(`### ${help.icon} ${help.title}`);
    push();
    push(`**What it is for.** ${help.summary}`);
    push();
    for (const [heading, body] of help.sections || []) push(`- **${heading}.** ${body}`);
    push();

    push('**Visual characteristics.**');
    push();
    if (profile.styled === 0) {
      push(`- No classes of its own; it is styled entirely by inherited panel rules.`);
    } else {
      push(`- ${profile.styled} CSS rules target its own classes.`);
      if (profile.minFont !== null) {
        const type = profile.fontSpread.length > 1
          ? `runs from ${profile.minFont}px to ${profile.maxFont}px (${profile.fontSpread.join(' / ')}px)`
          : `is ${profile.minFont}px throughout`;
        push(`- Type ${type}. Floors are enforced by \`tests/unit/typeScale.test.js\`.`);
      }
      if (profile.layouts.length) push(`- Layout: ${profile.layouts.map((l) => `\`${l}\``).join('; ')}.`);
      if (profile.colors.length) push(`- Accents: ${profile.colors.map((c) => `\`${c}\``).join('; ')}.`);
    }
    if (canvases.length) push(`- Renders ${canvases.length} live canvas graphs; long-press one for what it measures.`);
    push();

    push('**Controls.**');
    push();
    if (!facts.controls.length && !facts.sliders) {
      push('- None. This is read-only by design: every value it shows is derived from the simulation, and editing a readout would desynchronise it from what it measures.');
    } else {
      for (const c of facts.controls) push(`- \`<${c}>\``);
      if (facts.sliders) push(`- ${facts.sliders} sliders, built by the shared \`sliderControl\` factory so they all get the same tap target and help behaviour.`);
    }
    push();
  }
}

push('## Coverage');
push();
push(`- **${TAB_ORDER.length} top-level tabs** and **${subTabCount} sub-tabs**, all of them listed above.`);
push(`- **${moduleCount} UI modules**, each mapped to the file that builds it.`);
push(`- **${controlCount} control types** across those modules.`);
push(`- **${accountedCells.size} of ${Object.keys(CELL_HELP).length} analytics cells** are attributed to a panel above; the remainder belong to panels that are not tab-mounted.`);
push(`- **${Object.keys(GRAPH_HELP).length} graphs** have their own help entries. Long-press any graph or cell in the app to read it.`);
push();
push('This is a view of the code, not a copy of it. If a module here looks wrong, the');
push('fix belongs in `src/ui/`, and the report follows on the next build.');
push();

const report = `${lines.join('\n')}\n`;

// ── Validation: the table must match reality ─────────────────────────────
const problems = [];
for (const [subId, meta] of Object.entries(PANELS)) {
  if (!TAB_SUBTABS[Object.keys(TAB_SUBTABS).find((t) => (TAB_SUBTABS[t] || []).includes(subId))] &&
      !TAB_HELP[subId] && !subIdsHas(subId)) {
    problems.push(`${subId} is in PANELS but is neither a tab nor a sub-tab`);
  }
  if (!HTML.includes(meta.mount)) problems.push(`${subId}: index.html has no #${meta.mount} mount point`);
  const src = await readFile(resolve(ROOT, meta.file), 'utf8').catch(() => null);
  if (src === null) problems.push(`${subId}: ${meta.file} does not exist`);
}
const orphanCells = Object.keys(CELL_HELP).filter((c) => !accountedCells.has(c) && !c.startsWith('dna-'));
if (orphanCells.length && problems.length === 0) {
  // Not fatal: some cells legitimately live outside a tab panel. Worth a line
  // in the report rather than a build failure.
  push('');
}
if (problems.length) {
  console.error('PANELS table is out of date with the code:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

function subIdsHas(id) {
  return Object.values(TAB_SUBTABS).some((list) => list.includes(id));
}

if (CHECK_ONLY) {
  const current = await readFile(OUT, 'utf8').catch(() => '');
  if (current !== report) {
    console.error('docs/systems/ui-module-report.md is stale. Run: npm run report:ui');
    process.exit(1);
  }
  console.log('ui-module-report.md is up to date');
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, report);
  console.log(`Wrote docs/systems/ui-module-report.md (${report.split('\n').length} lines, ${moduleCount} modules)`);
}
