// CA-A5: main.js spawn paths copy species DNA into the particle cache through
// dna/codec.js writeDNACache. The result must be bit-identical (as stored in
// the Float32 particle buffer) to both former inline formulas.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DNA_RANGES, MAX_SPECIES } from '../../src/constants.js';
import { writeDNACache, DNA_CACHE_PARAMS } from '../../src/dna/codec.js';
import { getDNAFloat } from '../../src/dna/dnaBuffer.js';
import { SplitMix32 } from '../../src/core/prng.js';

function legacyInline(view, start, buf, s) { // main.js:698 before CA-A5
  const dnaBase = s * 64;
  for (let d = 0; d < 42; d++) {
    const raw = buf[dnaBase + d] || 0;
    const norm = raw / 65535;
    const r = DNA_RANGES[d] || { min: -1, max: 1 };
    view[start + d] = norm * (r.max - r.min) + r.min;
  }
}
function legacyGetFloat(view, start, buf, s) { // main.js:613 / :730 before CA-A5
  for (let d = 0; d < 42; d++) {
    const r = DNA_RANGES[d] || { min: -1, max: 1 };
    view[start + d] = getDNAFloat(buf, s, d, r.min, r.max);
  }
}

describe('DNA cache via codec (CA-A5)', () => {
  const buf = new Uint16Array(64 * 64);
  const rng = new SplitMix32(4242);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(rng.next() * 65536);
  buf[0] = 0; buf[1] = 65535; buf[2] = 32768;

  it('copies exactly 42 params', () => expect(DNA_CACHE_PARAMS).toBe(42));

  it('is bit-identical to both former inline formulas for every species', () => {
    for (let s = 0; s < Math.min(MAX_SPECIES, 64); s++) {
      const a = new Float32Array(50), b = new Float32Array(50), c = new Float32Array(50);
      writeDNACache(a, 8, buf, s);
      legacyInline(b, 8, buf, s);
      legacyGetFloat(c, 8, buf, s);
      expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)), `species ${s} vs inline`).toBe(true);
      expect(Buffer.from(a.buffer).equals(Buffer.from(c.buffer)), `species ${s} vs getDNAFloat`).toBe(true);
    }
  });

  it('main.js has no inline 65535 dequantize and no hand-rolled dequantize loop', () => {
    const src = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/\/\s*65535/);
    expect(src).not.toMatch(/getDNAFloat\(/);
    expect(src.match(/writeDNACache\(/g).length).toBe(3); // the 3 spawn paths
  });
});
