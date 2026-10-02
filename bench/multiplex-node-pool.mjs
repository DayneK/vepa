// worker_threads endpoint factory for createShardPool (bench + tests).
import { Worker } from 'node:worker_threads';

export function nodeSpawn() {
  const w = new Worker(new URL('./shard-worker-node.mjs', import.meta.url));
  w.unref();
  return {
    post: (m, t) => w.postMessage(m, t || []),
    onMessage: (cb) => w.on('message', cb),
    terminate: () => w.terminate(),
  };
}
