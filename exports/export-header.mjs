// ARP-10: provenance header shared by the export snapshot generators.
// Records producer, generation date (AEST) and the source revision (git HEAD;
// "-dirty" when tracked files other than the snapshots themselves differ).
import { execFileSync } from 'node:child_process';

const SNAPSHOTS = ['exports/vepa-full-codebase-concat.md', 'exports/vepa-docs-concat.md'];

export function exportProvenance(producer) {
  let rev = 'unknown', dirty = false;
  try {
    rev = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' })
      .split('\n').filter(Boolean).some((l) => !SNAPSHOTS.includes(l.slice(3)));
  } catch { /* not a git checkout */ }
  const date = new Date(Date.now() + 10 * 3600e3).toISOString().slice(0, 10); // AEST (UTC+10)
  return { producer, date, sourceRevision: rev + (dirty ? '-dirty' : '') };
}

export function headerLines(p) {
  return `**Producer:** ${p.producer} · **Generated:** ${p.date} (AEST) · **Source revision:** \`${p.sourceRevision}\``;
}

/** Parse the header back (exports:check). */
export function parseHeader(text) {
  const m = text.match(/\*\*Producer:\*\* (.+?) · \*\*Generated:\*\* (\d{4}-\d{2}-\d{2}) \(AEST\) · \*\*Source revision:\*\* `([^`]+)`/);
  return m ? { producer: m[1], date: m[2], sourceRevision: m[3] } : null;
}
