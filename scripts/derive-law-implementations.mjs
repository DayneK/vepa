#!/usr/bin/env node
// ARP-7 / LRA-3 / AUD-STC: derive, by static scan of src/, each law's
// implementing function and the stride fields it reads and writes.
//
//   node scripts/derive-law-implementations.mjs          # write src/state/lawImplementations.generated.js
//   node scripts/derive-law-implementations.mjs --check  # fail if stale
//
// Method (documented limits): find every gate site of LAW_INDEXES.<NAME>
// (active[...], isSet(..., ...), syn[...]) in src/physics; the implementing
// function is the first apply*/update*/compute*/… call within the gated block,
// resolved to its `function` definition in src/. Reads/writes are the stride
// fields (S.<FIELD> / STRIDE_INDEXES.<FIELD>) referenced in that function's body
// (plus one level of same-file helpers), a write being `[… + S.F] =|+=|-=|*=|/=`.
// Laws gated only inline record `solve` in src/physics/solver.js and the fields
// of the gated block. Metadata only: nothing here changes simulation behaviour.
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';

const { LAW_INDEXES, STRIDE_INDEXES } = await import('../src/constants.js');
const OUT = 'src/state/lawImplementations.generated.js';
const FIELDS = new Set(Object.keys(STRIDE_INDEXES));

function files(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) out.push(...files(p)); else if (p.endsWith('.js')) out.push(p);
  }
  return out.sort();
}
const SRC = files('src').filter((f) => !f.endsWith('.generated.js'));
const text = Object.fromEntries(SRC.map((f) => [f, readFileSync(f, 'utf8')]));

// function name → { file, body }
const defs = new Map();
const spans = [];
for (const f of SRC) {
  const re = /(?:^|\n)\s*(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(text[f]))) {
    const open = text[f].indexOf('{', m.index + m[0].length);
    const body = blockFrom(text[f], open);
    spans.push({ file: f, name: m[1], start: open, end: open + body.length });
    if (!defs.has(m[1])) defs.set(m[1], { file: f, body });
  }
}
/** Innermost function in `file` whose body contains character offset `off`. */
function enclosingFn(file, off) {
  let best = null;
  for (const sp of spans) if (sp.file === file && sp.start <= off && off < sp.end && (!best || sp.start > best.start)) best = sp;
  return best ? best.name : null;
}
function blockFrom(src, open) {
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}
function fieldsIn(body) {
  const reads = new Set(), writes = new Set();
  const re = /\b(?:S|R|STRIDE_INDEXES|SI)\.([A-Z][A-Z0-9_]*)\b(\s*\]\s*(?:[-+*/]?=)(?!=))?/g;
  let m;
  while ((m = re.exec(body))) {
    if (!FIELDS.has(m[1])) continue;
    if (m[2]) writes.add(m[1]); else reads.add(m[1]);
  }
  return { reads, writes };
}
const CALL = /\b((?:apply|update|compute|run|advance|process|resolve|sample|emit|accumulate|handle)[A-Z][\w$]*)\s*\(/;

const out = {};
for (const name of Object.keys(LAW_INDEXES).sort((a, b) => LAW_INDEXES[a] - LAW_INDEXES[b])) {
  const gate = new RegExp(`LAW_INDEXES\\.${name}\\b`);
  let found = null, inline = null;
  const cands = [];
  const key = name.toLowerCase().replace(/_law$/, '').replace(/_/g, '');
  const stem = key.slice(0, Math.min(5, key.length));
  for (const f of SRC.filter((p) => p.startsWith('src/physics/')).sort((a, b) => (b.endsWith('/solver.js') ? 1 : 0) - (a.endsWith('/solver.js') ? 1 : 0))) {
    const lines = text[f].split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!gate.test(lines[i]) || !/(active\[|isSet\(|syn\[|has\()/.test(lines[i])) continue;
      // Early-return guard inside a function: that function implements the law.
      if (/if\s*\(\s*!\s*isSet\([^)]*\)\s*\)\s*return/.test(lines[i])) {
        const enclosing = enclosingFn(f, lines.slice(0, i).join('\n').length + 1);
        if (enclosing && defs.has(enclosing)) cands.push({ score: 200, function: enclosing, file: defs.get(enclosing).file, gate: f });
        continue;
      }
      for (let k = i; k < Math.min(lines.length, i + 8); k++) {
        const re = new RegExp(CALL.source, 'g');
        let m;
        while ((m = re.exec(lines[k]))) {
          if (!defs.has(m[1])) continue;
          const fn = m[1].toLowerCase();
          const named = fn.includes(key) ? 100 : fn.includes(stem) ? 50 : 0;
          if (!named && k !== i) continue; // unnamed calls count only on the gate line itself
          const score = named + (k === i ? 20 : 0) + (f.endsWith('solver.js') ? 10 : 0) - (k - i);
          cands.push({ score, function: m[1], file: defs.get(m[1]).file, gate: f });
        }
      }
      if (!inline) {
        const off = lines.slice(0, i).join('\n').length;
        const brace = text[f].indexOf('{', off);
        const encl = enclosingFn(f, off + 1);
        inline = { function: encl || '(module scope)', file: f, gate: f, body: blockFrom(text[f], brace).slice(0, 6000) };
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);
  // Accept a call only if it is name-matched or sits right at a solver gate.
  if (cands.length && cands[0].score >= 5) found = cands[0];
  if (!found && !inline) {
    // Not gated in src/physics: look for an apply<Name> definition anywhere.
    const d = [...defs.keys()].find((fn) => fn.toLowerCase() === 'apply' + key);
    if (d) found = { function: d, file: defs.get(d).file, gate: '(no direct gate found)' };
  }
  const site = found || inline;
  if (!site) { out[name] = { implementedBy: null, reads: [], writes: [], derivedBy: 'static-scan: no gate site found' }; continue; }
  let body = found ? defs.get(found.function).body : site.body;
  if (found) { // one level of same-file helpers
    const helper = /\b([a-z][\w$]*)\s*\(/g;
    let m;
    const extra = [];
    while ((m = helper.exec(body))) { const d = defs.get(m[1]); if (d && d.file === found.file && m[1] !== found.function) extra.push(d.body); }
    body += extra.join('\n');
  }
  const { reads, writes } = fieldsIn(body);
  out[name] = {
    implementedBy: `${site.file}#${site.function}`,
    gate: site.gate,
    reads: [...reads].sort(),
    writes: [...writes].sort(),
    derivedBy: found ? 'static-scan: gated call' : 'static-scan: inline gated block',
  };
}

const js = `// GENERATED by scripts/derive-law-implementations.mjs — do not edit by hand.
// Static-scan metadata (ARP-7 / LRA-3 / AUD-STC): implementing function and the
// stride fields each law's implementation reads and writes. Descriptive only.
export const LAW_IMPLEMENTATIONS = Object.freeze(${JSON.stringify(out, null, 2)});
`;
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== js) { console.error(`${OUT} is stale; run node scripts/derive-law-implementations.mjs`); process.exit(1); }
  console.log(`${OUT} up to date`);
} else {
  writeFileSync(OUT, js);
  const n = Object.values(out);
  console.log(`wrote ${OUT}: ${n.filter((r) => r.derivedBy.includes('gated call')).length} via function, ${n.filter((r) => r.derivedBy.includes('inline')).length} inline, ${n.filter((r) => !r.implementedBy).length} unresolved`);
}
