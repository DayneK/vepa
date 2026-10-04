// LRA-7 (AC-35): information/biology coupling trace
// memory → learning → culture → behaviour → inheritance.
//
// The trace names the law realising each stage, the carrier field handed to
// the next stage and the implementing function, all read from the ontology.
// It documents the path the code actually implements (checked on a fixture in
// tests/unit/informationTrace.test.js); descriptive only.
import { LAW_RELATIONSHIPS } from './lawOntology.js';

export const INFORMATION_BIOLOGY_PATH = Object.freeze([
  Object.freeze({ stage: 'memory', law: 'MEMORY', carrier: 'MEMORY', note: 'Contacts refresh per-particle memory.' }),
  Object.freeze({ stage: 'learning', law: 'SYMBOL', carrier: 'SYMBOL_TOKEN', note: 'Memory-conditioned symbol force (LEARN itself is velocity alignment, D-022).' }),
  Object.freeze({ stage: 'culture', law: 'CULTURE', carrier: 'DNA_CACHE', note: 'Same-species contact blends DNA-cache loci.' }),
  Object.freeze({ stage: 'behaviour', law: 'GRAV', carrier: 'VEL_X', note: 'Per-pair DNA modifiers (FORCE / HIDDEN_MASS) shape motion.' }),
  Object.freeze({ stage: 'inheritance', law: 'REPRO', carrier: 'offspring.dna', note: 'Offspring copy the parent DNA cache.' }),
]);

export const INFORMATION_BIOLOGY_LINKS = Object.freeze([
  Object.freeze({ from: 'MEMORY', to: 'SYMBOL', via: 'MEMORY' }),
  Object.freeze({ from: 'SYMBOL', to: 'CULTURE', via: null, kind: 'co-occurring contact stage (no shared field)' }),
  Object.freeze({ from: 'CULTURE', to: 'GRAV', via: 'DNA_CACHE' }),
  Object.freeze({ from: 'CULTURE', to: 'REPRO', via: 'DNA_CACHE' }),
]);

/** Export the path as a machine-readable trace (JSON-safe). */
export function exportInformationBiologyTrace(relationships = LAW_RELATIONSHIPS) {
  const path = INFORMATION_BIOLOGY_PATH.map((s) => {
    const r = relationships[s.law] || {};
    return { stage: s.stage, law: s.law, carrier: s.carrier, implementedBy: r.implementedBy || null, reads: [...(r.reads || [])], writes: [...(r.writes || [])], note: s.note };
  });
  // Field hand-offs as the code implements them; the learning → culture step
  // shares no field (both act on the same neighbour contacts), recorded as such.
  const links = INFORMATION_BIOLOGY_LINKS.map((l) => ({ ...l }));
  return { schema: 'vepa-information-biology-trace/v1', stages: path.map((p) => p.stage), path, links };
}
