// Node (worker_threads) entry for the multiplex worker pool — used by
// bench/multiplex-bench.mjs and tests. Same core as src/multiplex/shardWorker.js.
import { parentPort } from 'node:worker_threads';

const { handleShardMessage } = await import('../src/multiplex/shardWorkerCore.js');
parentPort.on('message', (m) => {
  const out = handleShardMessage(m);
  if (out) parentPort.postMessage(out.reply, out.transfer);
});
