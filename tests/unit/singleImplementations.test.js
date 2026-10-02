// CA-DUP1 / CA-DUP3: one accretion-pair predicate and one cipher-key
// derivation in src/.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cipherKey as lawsCipherKey } from '../../src/physics/laws.js';
import { cipherKey } from '../../src/physics/cipherKey.js';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
function allJs(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allJs(p) : p.endsWith('.js') ? [p] : [];
  });
}
const sources = allJs(SRC).map((p) => readFileSync(p, 'utf8'));
const count = (re) => sources.reduce((n, s) => n + (s.match(re) || []).length, 0);

describe('single implementations', () => {
  it('one accretion-pair predicate (CA-DUP1)', () => {
    expect(count(/function isAccretion\w*\s*\(/g)).toBe(1);
  });
  it('one cipher-key derivation (CA-DUP3)', () => {
    expect(count(/function cipherKey\w*\s*\(/g)).toBe(1);
    expect(count(/TUNING_CH1\]\s*\|\|\s*0\)\s*\n\s*\+\s*\(view/g)).toBe(1);
    expect(lawsCipherKey).toBe(cipherKey);
  });
});
