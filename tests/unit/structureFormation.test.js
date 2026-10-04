// LRA-6 (AC-34): BOND → CONSTRAINT → TOPOLOGY ordering and state hand-offs.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { STRUCTURE_PIPELINE, inspectBondGraph, solverStageOrder } from '../../src/physics/structureFormation.js';
import { LAW_RELATIONSHIPS } from '../../src/state/lawOntology.js';
import { makeWorld, step, PARTICLE_STRIDE, S } from '../helpers/lawWorld.js';

// A loose line of particles 1.8 apart (inside BOND range), stiff DNA, one species.
const fixture = () => makeWorld({
  n: 6, init: (v, b, i) => {
    v[b + S.POS_X] = 1000 + i * 1.8; v[b + S.POS_Y] = 1000; v[b + S.POS_Z] = 1000;
    v[b + S.SPECIES_ID] = 0; v[b + S.DNA_CACHE_START + 8] = 1; // STIFFNESS
  },
});
const posX = (w) => Array.from({ length: w.n }, (_, i) => w.view[i * PARTICLE_STRIDE + S.POS_X]);

describe('structure formation contract (LRA-6)', () => {
  it('declares the pipeline in ontology order (TOPOLOGY depends on BOND and CONSTRAINT)', () => {
    expect(STRUCTURE_PIPELINE.map((s) => s.law)).toEqual(['BOND', 'CONSTRAINT', 'TOPOLOGY']);
    expect(LAW_RELATIONSHIPS.TOPOLOGY.dependsOn).toEqual(['BOND', 'CONSTRAINT']);
    expect(LAW_RELATIONSHIPS.BOND.writes).toContain('BOND_COUNT');
    expect(LAW_RELATIONSHIPS.TOPOLOGY.reads).toContain('BOND_COUNT');
  });

  it('the solver evaluates BOND before CONSTRAINT before TOPOLOGY', () => {
    const o = solverStageOrder(readFileSync(new URL('../../src/physics/solver.js', import.meta.url), 'utf8'));
    expect(o.BOND).toBeGreaterThan(0);
    expect(o.BOND).toBeLessThan(o.CONSTRAINT);
    expect(o.CONSTRAINT).toBeLessThan(o.TOPOLOGY);
  });

  it('hand-off 1: BOND produces the bond graph', () => {
    const w = step(fixture(), ['BOND'], 3);
    const g = inspectBondGraph(w.view, w.n, PARTICLE_STRIDE);
    expect(g.bondedPairs).toBeGreaterThan(0);
    expect(g.totalBondCount).toBe(2 * g.bondedPairs);
  });

  it('hand-off 2: CONSTRAINT is inert without bonds and acts once BOND has linked the pair', () => {
    const none = posX(step(fixture(), ['CONTACT'], 10));
    const constraintOnly = posX(step(fixture(), ['CONTACT', 'CONSTRAINT'], 10));
    expect(constraintOnly).toEqual(none); // no bonds → no constraint force
    const bond = posX(step(fixture(), ['CONTACT', 'BOND'], 10));
    const bondConstraint = posX(step(fixture(), ['CONTACT', 'BOND', 'CONSTRAINT'], 10));
    expect(bondConstraint).not.toEqual(bond);
  });

  it('hand-off 3: TOPOLOGY consumes BOND_COUNT (inert at equal counts, acts on the bonded graph)', () => {
    const w0 = fixture();
    const g0 = inspectBondGraph(w0.view, w0.n, PARTICLE_STRIDE);
    expect(g0.totalBondCount).toBe(0);
    expect(posX(step(fixture(), ['CONTACT', 'TOPOLOGY'], 10))).toEqual(posX(step(fixture(), ['CONTACT'], 10)));
    const bc = posX(step(fixture(), ['CONTACT', 'BOND', 'CONSTRAINT'], 10));
    const bct = posX(step(fixture(), ['CONTACT', 'BOND', 'CONSTRAINT', 'TOPOLOGY'], 10));
    expect(bct).not.toEqual(bc);
  });
});
