// ============================================================================
// Chaos Multiplex worker pool (MX-20, D-016).
//
// Sims are pinned to a worker (key % size) so each sim's solver context lives
// in exactly one worker. The pool is transport-agnostic: `spawn(i)` returns an
// endpoint { post(msg, transfer), onMessage(cb), terminate() }. The browser
// uses module Workers (defaultSpawn); tests and the bench use worker_threads.
// ============================================================================

/** Browser endpoint factory (module worker). Returns null when unavailable. */
export function browserSpawn() {
  if (typeof Worker === 'undefined') return null;
  const w = new Worker(new URL('./shardWorker.js', import.meta.url), { type: 'module' });
  return {
    post: (msg, transfer) => w.postMessage(msg, transfer || []),
    onMessage: (cb) => { w.onmessage = (e) => cb(e.data); },
    terminate: () => w.terminate(),
  };
}

/** Default pool size: one worker per spare core, at most one per sim. */
export function defaultPoolSize(sims, cores) {
  const c = Math.max(1, (cores || (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4) - 1);
  return Math.max(1, Math.min(sims || 1, c));
}

export function createShardPool({ size, spawn }) {
  const endpoints = [];
  const replies = [];
  for (let i = 0; i < size; i++) {
    const ep = spawn(i);
    if (!ep) break;
    ep.onMessage((data) => { if (data && data.type === 'ticked') replies.push(data); });
    endpoints.push(ep);
  }
  let seq = 0;
  return {
    get size() { return endpoints.length; },
    /** Queue one tick for a sim; returns the message sequence number. */
    post(key, msg, transfer) {
      const ep = endpoints[key % endpoints.length];
      const s = ++seq;
      ep.post({ ...msg, seq: s, key }, transfer);
      return s;
    },
    drop(key) { if (endpoints.length) endpoints[key % endpoints.length].post({ type: 'drop', key }); },
    /** Take every reply received so far. */
    drain() { return replies.splice(0, replies.length); },
    terminate() { for (const ep of endpoints) ep.terminate(); endpoints.length = 0; },
  };
}
