export class SplitMix32 {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.state = seed | 0;
  }

  /** Serializable {seed, state} pair (RRP E9: persisted in world saves). */
  snapshot() {
    return { seed: this.seed >>> 0, state: this.state >>> 0 };
  }

  /**
   * Rebuild a generator from snapshot(); the next draw continues the saved
   * sequence exactly. Returns null for a missing/invalid snapshot.
   */
  static fromSnapshot(snap) {
    if (!snap || !Number.isFinite(snap.state)) return null;
    const g = new SplitMix32(Number.isFinite(snap.seed) ? snap.seed : snap.state);
    g.state = snap.state | 0;
    return g;
  }

  next() {
    let z = (this.state + 0x9e3779b9) | 0;
    this.state = z;
    z = (z ^ (z >>> 16)) | 0;
    z = Math.imul(z, 0x21f0aaad);
    z = z ^ (z >>> 15);
    z = Math.imul(z, 0x735a2d97);
    z = z ^ (z >>> 15);
    return (z >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }
}
