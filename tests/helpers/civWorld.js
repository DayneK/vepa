// B7 runtime harness: a headless copy of main.js's live loop for the systems
// the civilisation adapter touches — solve → spawn offspring (append-only, as
// spawnOffspring) → death scan → groups → governance → civilisation registry
// (culture founding + federation, as main.js) → civRuntime step — plus a world
// save/restore through captureWorldState/restoreWorldState and JSON.
import { PARTICLE_STRIDE as P, STRIDE_INDEXES as S, LAW_INDEXES, DNA_RANGES } from '../../src/constants.js';
import { createLawState, set as lawSet } from '../../src/state/lawState.js';
import { createDNABuffer, loadDefaults, getDNAFloat } from '../../src/dna/dnaBuffer.js';
import { solve, drainOffspring, createSolverContext, enterSolverContext } from '../../src/physics/solver.js';
import { createGroupRegistry, updateGroups, declareGroup } from '../../src/state/groupRegistry.js';
import { runGovernance } from '../../src/state/governance.js';
import {
  createCivilizationRegistry, foundCulture, createFederation, addFederationMember, stepCivilization,
  serializeCivilization, restoreCivilization,
} from '../../src/state/civilization.js';
import {
  createCivRuntime, civRuntimeOnBirth, civRuntimeOnDeath, civRuntimeOnAlliance, civRuntimeOnConflict,
  stepCivRuntime, serializeCivRuntime, restoreCivRuntime,
} from '../../src/engines/civRuntime.js';
import { captureWorldState, restoreWorldState, exportWorldSave, parseWorldSave } from '../../src/state/worldSave.js';

export const SOCIAL_CADENCE = 10;
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

export function createCivWorld({ n = 120, capacity = 900, seed = 5, laws = ['LIFE', 'REPRO', 'MEMORY'], enabled = true } = {}) {
  const view = new Float32Array(capacity * P);
  const dna = createDNABuffer(); loadDefaults(dna, DNA_RANGES);
  const r = lcg(seed);
  const centres = [[700, 700], [1000, 1300], [1300, 700], [1000, 1000]];
  for (let i = 0; i < n; i++) {
    const b = i * P, c = centres[i % centres.length], sp = i % 3;
    view[b + S.POS_X] = c[0] + (r() - 0.5) * 60; view[b + S.POS_Y] = c[1] + (r() - 0.5) * 60; view[b + S.POS_Z] = 1000 + (r() - 0.5) * 60;
    view[b + S.VEL_X] = (r() - 0.5); view[b + S.VEL_Y] = (r() - 0.5);
    view[b + S.MASS] = 1; view[b + S.ENERGY] = 20 + r() * 80; view[b + S.RADIUS] = 0.6; view[b + S.SPECIES_ID] = sp;
    view[b + S.AGE] = 150 + r() * 200; view[b + S.REPRO_DRIVE] = 100; view[b + S.ENTANGLE_ID] = -1;
    for (let k = 1; k <= 6; k++) view[b + S[`BOND_PARTNER_${k}`]] = -1;
    for (let d = 0; d < 42; d++) { const rg = DNA_RANGES[d] || { min: -1, max: 1 }; view[b + S.DNA_CACHE_START + d] = getDNAFloat(dna, sp, d, rg.min, rg.max); }
  }
  const lawState = createLawState();
  for (const name of laws) lawSet(lawState, LAW_INDEXES[name]);
  // Player-declared groups, one per species (the same declareGroup the UI uses).
  const groups = createGroupRegistry();
  for (let sp = 0; sp < 3; sp++) declareGroup(groups, `clan-${sp}`, [sp]);
  return {
    view, count: n, capacity, dna, lawState, lawNames: laws, tick: 0, prng: lcg(seed + 1), enabled,
    ctx: createSolverContext(), groups, civ: createCivilizationRegistry(), rt: createCivRuntime(),
    prevDead: new Uint8Array(capacity), events: { births: 0, deaths: 0, alliances: 0, conflicts: 0 },
  };
}

function spawn(w, off) {
  if (w.count >= w.capacity) return;
  const i = w.count, b = i * P, pb = off.parentId * P;
  w.view.copyWithin(b, pb, pb + P);
  w.view[b + S.POS_X] = off.x; w.view[b + S.POS_Y] = off.y; w.view[b + S.POS_Z] = off.z || 1000;
  w.view[b + S.VEL_X] = 0; w.view[b + S.VEL_Y] = 0; w.view[b + S.VEL_Z] = 0;
  w.view[b + S.ENERGY] = off.energy ?? 30; w.view[b + S.AGE] = 0; w.view[b + S.DEAD] = 0; w.view[b + S.REPRO_DRIVE] = 0;
  w.count++;
  w.events.births++;
  if (w.enabled) civRuntimeOnBirth(w.rt, w.civ, { parent: off.parentId, child: i, species: w.view[b + S.SPECIES_ID] | 0, tick: w.tick });
}

export function runCivWorld(w, ticks) {
  for (let t = 0; t < ticks; t++) {
    w.tick++;
    const prev = enterSolverContext(w.ctx);
    try { solve(w.view, w.count, P, w.lawState, w.dna, 2000, 1 / 60, w.prng); } finally { enterSolverContext(prev); }
    const born = (() => { const p2 = enterSolverContext(w.ctx); try { return drainOffspring(); } finally { enterSolverContext(p2); } })();
    for (const off of born) spawn(w, off);
    for (let i = 0; i < w.count; i++) {
      const dead = w.view[i * P + S.DEAD] >= 0.5 ? 1 : 0;
      if (dead && !w.prevDead[i]) { w.events.deaths++; if (w.enabled) civRuntimeOnDeath(w.rt, w.civ, { index: i, species: w.view[i * P + S.SPECIES_ID] | 0 }); }
      w.prevDead[i] = dead;
    }
    for (const ev of updateGroups(w.groups, w.view, w.count, P, null, { lawActiveCount: w.lawNames.length })) void ev;
    if (w.tick % SOCIAL_CADENCE === 0) {
      const gov = runGovernance(w.groups, w.view, P, null, { tick: w.tick, force: true });
      for (const ev of gov.events) {
        if (ev.type === 'governance:alliance') { w.events.alliances++; if (w.enabled) civRuntimeOnAlliance(w.rt, w.civ, { group: ev.group, other: ev.other, tick: w.tick }); }
        if (ev.type === 'governance:conflict') { w.events.conflicts++; if (w.enabled) civRuntimeOnConflict(w.rt, { group: ev.group, other: ev.other, tick: w.tick }); }
      }
      for (const g of w.groups.groups.values()) {
        if (![...w.civ.cultures.keys()].some((id) => w.civ.lifecycle.records.get(id)?.attributes.ownerGroupId === g.id)) {
          foundCulture(w.civ, g.id, { symbols: ['FIRE', 'SONG', 'TOOL', 'MAP', 'RITE'].slice(0, 2 + (g.id % 3)) });
        }
      }
      if (w.civ.federations.size === 0 && w.groups.groups.size >= 2) {
        const fed = createFederation(w.civ, { name: 'first-tribe', kind: 'tribe' });
        for (const gid of [...w.groups.groups.keys()].slice(0, 6)) addFederationMember(w.civ, fed.id, gid);
      }
      stepCivilization(w.civ, { tick: w.tick });
      if (w.enabled) stepCivRuntime(w.rt, w.civ, { view: w.view, stride: P, groups: w.groups.groups, tick: w.tick, synthetic: { organisms: 0, uploads: 0, activeUploads: 0, programs: {} }, eco: null });
    }
  }
  return w;
}

/** Save → .vepa.json export → import → restore, mirroring main.js currentWorldState/applyWorldRestore. */
export function saveAndRestore(w) {
  const saved = captureWorldState({
    view: w.view, count: w.count, speciesCount: 3, dna: w.dna, laws: w.lawState, tick: w.tick,
    civilization: { ...serializeCivilization(w.civ), runtime: serializeCivRuntime(w.rt) },
  });
  const json = parseWorldSave(exportWorldSave(saved)); // the .vepa.json export/import path
  const view = new Float32Array(w.capacity * P);
  const out = restoreWorldState(json, { view, dna: createDNABuffer(), laws: createLawState(), worldParams: {}, runtime: {} });
  const civ = restoreCivilization(out.civilization);
  const rt = out.civilization.runtime ? restoreCivRuntime(out.civilization.runtime) : createCivRuntime();
  return { ...w, view, count: out.particleCount, civ, rt };
}
