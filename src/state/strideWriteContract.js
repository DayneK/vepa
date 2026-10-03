// AUD-STC (AC-41): stride-field writer-ownership contract.
//
// For each stride field, the laws allowed to write it. This is a reviewed,
// hand-maintained contract (seeded from the static scan at ARP-7); the test
// cross-checks it against src/state/lawImplementations.generated.js and fails
// on any write by a law not listed here. Fields absent from the map are not
// written by any law (only by integration/bookkeeping in the solver, which
// is outside this contract). Descriptive only; never consumed at runtime.
import { STRIDE_INDEXES } from '../constants.js';

export const STRIDE_FIELD_WRITERS = Object.freeze({
  ALPHA: Object.freeze(['ASTRAL', 'OXIDATION']),
  ARMOR: Object.freeze(['IMMUNITY']),
  BOND_COUNT: Object.freeze(['BOND', 'ISOMERIZATION', 'POLYMER']),
  CHAOS_STATE_X: Object.freeze(['CHAOS']),
  CHAOS_STATE_Y: Object.freeze(['CHAOS']),
  CHAOS_STATE_Z: Object.freeze(['CHAOS']),
  CHARGE: Object.freeze(['ACIDITY', 'CAPACITANCE', 'CURRENT', 'DISCHARGE', 'IONIZATION', 'NEUTRALIZATION', 'OXIDATION', 'PLASMA', 'REDUCTION', 'SHIELDING', 'SUPERCONDUCTIVITY']),
  COLOR_B: Object.freeze(['LIFE', 'OXIDATION', 'PHENOTYPE']),
  COLOR_G: Object.freeze(['LIFE', 'OXIDATION', 'PHENOTYPE']),
  COLOR_R: Object.freeze(['LIFE', 'OXIDATION', 'PHENOTYPE']),
  DEAD: Object.freeze(['ANTIMATTER', 'ASTRAL', 'LIFE', 'RADIATION', 'SENESCENCE']),
  ENERGY: Object.freeze(['AUTOCATALYSIS', 'BOIL', 'CLAIRVOYANCE', 'CONSCIOUSNESS', 'ELECTROLYSIS', 'EXOTHERMIC', 'HIBERNATION', 'IMMUNITY', 'ISOMERIZATION', 'LATENT_HEAT', 'LIFE', 'OXIDATION', 'PARASITE', 'PHASE_RADIATION', 'PHOTOLYSIS', 'PRECIPITATION', 'PRECOGNITION', 'RADIATION', 'REPRO', 'SHIELDING', 'SUBLIMATION', 'SYMBIOSIS', 'TELEPATHY', 'TELEPORT']),
  ENTANGLE_ID: Object.freeze(['ENTANGLEMENT', 'TELEPORT']),
  ENTANGLE_PHASE: Object.freeze(['ENTANGLEMENT', 'TELEPORT']),
  HUNGER: Object.freeze(['LIFE']),
  MASS: Object.freeze(['ASTRAL', 'BOIL', 'CONDENSE', 'DEPOSIT', 'ELECTROLYSIS', 'LIFE', 'OXIDATION', 'PHOTOLYSIS', 'PRECIPITATION', 'PREDATION', 'STOICHIOMETRY', 'SUBLIMATION']),
  MEMORY: Object.freeze(['COMMS', 'CONSCIOUSNESS', 'FEEDBACK', 'LANGUAGE', 'MEMORY', 'OBSERVER']),
  MITOSIS_TIMER: Object.freeze(['COLL', 'CONTACT']),
  PARTNER_ID: Object.freeze(['COLL', 'CONTACT']),
  PHASE_1: Object.freeze(['SYNCHRONICITY']),
  PHASE_2: Object.freeze(['ENCRYPTION']),
  POS_X: Object.freeze(['TUNNELING', 'UNCERTAINTY', 'WAVEFUNCTION']),
  POS_Y: Object.freeze(['TUNNELING', 'UNCERTAINTY', 'WAVEFUNCTION']),
  POS_Z: Object.freeze(['TUNNELING', 'UNCERTAINTY', 'WAVEFUNCTION']),
  RADIATION_EXPOSURE: Object.freeze(['RADIATION']),
  RADIUS: Object.freeze(['COMPRESSION', 'DEPOSIT', 'EXPANSION', 'PHENOTYPE', 'PRECIPITATION']),
  REPRO_DRIVE: Object.freeze(['REPRO']),
  SELF_MODEL_SPEED: Object.freeze(['CONSCIOUSNESS']),
  SIGNAL: Object.freeze(['ANTENNA', 'ANTIMATTER', 'COMMS', 'CONSCIOUSNESS', 'DECOHERENCE', 'ELECTROLYSIS', 'ENCRYPTION', 'GLOW', 'LANGUAGE', 'PHASE_RADIATION', 'PHOTOLYSIS', 'POLARIZATION', 'PROTOCOL', 'RESONANCE', 'SIGNAL_BOOST', 'SPECTRAL', 'TELEPATHY']),
  SOUL: Object.freeze(['ASTRAL', 'SOUL_LAW']),
  SUPER_AMP_1: Object.freeze(['SUPERPOSITION']),
  SUPER_AMP_2: Object.freeze(['SUPERPOSITION']),
  SUPER_AMP_3: Object.freeze(['SUPERPOSITION']),
  SUPER_AMP_4: Object.freeze(['SUPERPOSITION']),
  SUPER_PHASE: Object.freeze(['SUPERPOSITION']),
  SYMBOL_TOKEN: Object.freeze(['SYMBOL']),
  TEMPERATURE: Object.freeze(['ADIABATIC', 'BOIL', 'CHAOS', 'COMPRESSION', 'CONDENSE', 'DEPOSIT', 'DISCHARGE', 'ELECTROLYSIS', 'EQUILIBRIUM', 'EXOTHERMIC', 'EXPANSION', 'FRICTION', 'LATENT_HEAT', 'NEUTRALIZATION', 'OXIDATION', 'PHASE_RADIATION', 'PLASMA', 'RESISTANCE', 'RUNAWAY', 'SUBLIMATION']),
  VEL_X: Object.freeze(['BOIL', 'CHAOS', 'COLD', 'HEAT', 'OBSERVER', 'PLANCK', 'SUBLIMATION', 'TELEPORT', 'WILL']),
  VEL_Y: Object.freeze(['BOIL', 'CHAOS', 'COLD', 'CONVECTION', 'HEAT', 'OBSERVER', 'PLANCK', 'SUBLIMATION', 'TELEPORT', 'WILL']),
  VEL_Z: Object.freeze(['BOIL', 'CHAOS', 'COLD', 'DIMENSIONALITY', 'HEAT', 'OBSERVER', 'PLANCK', 'TELEPORT', 'WILL']),
  WAVE_MEASURED: Object.freeze(['WAVE_PARTICLE']),
});

/**
 * @param {Record<string, {writes: string[]}>} implementations
 * @param {Record<string, string[]>} [contract]
 * @returns {string[]} errors
 */
export function checkStrideWriteContract(implementations, contract = STRIDE_FIELD_WRITERS) {
  const errors = [];
  for (const field of Object.keys(contract)) {
    if (!(field in STRIDE_INDEXES)) errors.push(`contract names unknown stride field ${field}`);
  }
  for (const [law, impl] of Object.entries(implementations)) {
    for (const field of impl.writes) {
      if (!(contract[field] || []).includes(law)) errors.push(`undeclared write: ${law} -> ${field}`);
    }
  }
  for (const [field, laws] of Object.entries(contract)) {
    for (const law of laws) {
      if (!(implementations[law]?.writes || []).includes(field)) errors.push(`stale owner: ${law} no longer writes ${field}`);
    }
  }
  return errors;
}
