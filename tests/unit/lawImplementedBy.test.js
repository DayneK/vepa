// ARP-7 (AC-30): every law has implementedBy, and the generated scan is current.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LAW_INDEXES } from '../../src/constants.js';
import { LAW_RELATIONSHIPS, validateLawOntology } from '../../src/state/lawOntology.js';
import { LAW_IMPLEMENTATIONS } from '../../src/state/lawImplementations.generated.js';

const root = fileURLToPath(new URL('../..', import.meta.url));

describe('law ontology implementedBy coverage (ARP-7)', () => {
  it('gives all 136 laws an implementedBy pointing at a real function', () => {
    const names = Object.keys(LAW_INDEXES);
    expect(names.length).toBe(136);
    for (const name of names) {
      const ref = LAW_RELATIONSHIPS[name].implementedBy;
      expect(ref, name).toMatch(/^src\/.+\.js#[\w$]+$/);
      const [file, fn] = ref.split('#');
      const src = readFileSync(`${root}/${file}`, 'utf8');
      expect(src, `${name} -> ${ref}`).toMatch(new RegExp(`function\\s+${fn.replace('$', '\\$')}\\s*\\(`));
    }
    expect(validateLawOntology()).toEqual([]);
  });

  it('maps guard-return laws to their own function and collision to the solver', () => {
    expect(LAW_RELATIONSHIPS.GRAV.implementedBy).toBe('src/physics/laws.js#applyGravity');
    expect(LAW_RELATIONSHIPS.GLOW.implementedBy).toBe('src/physics/laws.js#applyGlowEffect');
    expect(LAW_RELATIONSHIPS.LIFE.implementedBy).toBe('src/physics/laws.js#applyLifeCycle');
    expect(LAW_RELATIONSHIPS.COLL.implementedBy).toBe('src/physics/solver.js#solve');
    expect(LAW_RELATIONSHIPS.CONVECTION.implementedBy).toBe('src/physics/laws.js#applyConvection');
  });

  it('keeps hand-declared reads/writes and fills undeclared laws from the scan', () => {
    expect(LAW_RELATIONSHIPS.COLL.writes).toEqual(['VEL_X', 'VEL_Y', 'VEL_Z']);
    expect(LAW_RELATIONSHIPS.CONVECTION.writes).toEqual(LAW_IMPLEMENTATIONS.CONVECTION.writes);
    expect(LAW_RELATIONSHIPS.CONVECTION.notes[0]).toContain('derive-law-implementations');
  });

  it('generated file is up to date with the source', () => {
    expect(() => execFileSync(process.execPath, ['scripts/derive-law-implementations.mjs', '--check'], { cwd: root, stdio: 'pipe' })).not.toThrow();
  });
});
