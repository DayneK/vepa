#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseHeader } from '../exports/export-header.mjs';

const plan = JSON.parse(await readFile(new URL('../exports/publication-plan.json', import.meta.url), 'utf8'));
const errors = [];
if (plan.status !== 'configured-not-published') errors.push('publication status must remain explicit');
if (!plan.repository || !plan.sourceRepository) errors.push('source and destination repositories are required');
if (!Array.isArray(plan.canonicalArtifacts) || plan.canonicalArtifacts.length < 2) errors.push('at least two canonical handoff artifacts are required');
for (const artifact of plan.canonicalArtifacts || []) {
  if (!artifact.path || !artifact.producer || !artifact.useCase) errors.push(`incomplete artifact record: ${artifact.path || '<unnamed>'}`);
}
if (!plan.publication?.requiredEnvironment?.includes('VEPA_EXPORTS_TOKEN')) errors.push('publication must require an explicit token');
// ARP-10: every canonical snapshot carries producer, date and a source revision
// that exists in this repository's history.
for (const artifact of plan.canonicalArtifacts || []) {
  let text = '';
  try { text = await readFile(new URL(`../exports/${artifact.path}`, import.meta.url), 'utf8'); } catch { errors.push(`missing snapshot: exports/${artifact.path}`); continue; }
  const h = parseHeader(text.slice(0, 2000));
  if (!h) { errors.push(`exports/${artifact.path}: missing provenance header (producer, date, source revision)`); continue; }
  if (h.sourceRevision.endsWith('-dirty')) errors.push(`exports/${artifact.path}: generated from a dirty tree (${h.sourceRevision})`);
  try { execFileSync('git', ['cat-file', '-e', `${h.sourceRevision.replace(/-dirty$/, '')}^{commit}`], { stdio: 'ignore' }); }
  catch { errors.push(`exports/${artifact.path}: source revision ${h.sourceRevision} is not a commit in this repository`); }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`export publication contract valid: ${plan.repository} (${plan.status}); snapshot headers OK`);
