// ENCRYPTION key (v4.6.29): folds the TUNING_CH1-4 DNA channels of a
// particle's stride cache into a 0..7 cipher key. CA-DUP3: this is the single
// implementation, shared by laws.js (pair gate) and lawgroups/infoLaws.js
// (ENCRYPTION phase rotation).
import { STRIDE_INDEXES as S, DNA_INDEXES as D } from '../constants.js';

export function cipherKey(view, base) {
  const d = S.DNA_CACHE_START;
  const sum = (view[base + d + D.TUNING_CH1] || 0)
    + (view[base + d + D.TUNING_CH2] || 0)
    + (view[base + d + D.TUNING_CH3] || 0)
    + (view[base + d + D.TUNING_CH4] || 0);
  return Math.floor(Math.max(0, Math.min(1, sum / 4)) * 7);
}
