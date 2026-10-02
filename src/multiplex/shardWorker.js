// Browser entry for the Chaos Multiplex worker pool (see shardWorkerCore.js).
import { handleShardMessage } from './shardWorkerCore.js';

self.onmessage = (e) => {
  const out = handleShardMessage(e.data);
  if (out) self.postMessage(out.reply, out.transfer);
};
