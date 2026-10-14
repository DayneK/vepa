import { describe, expect, it } from 'vitest';
import { runRestartTransaction } from '../../src/state/restartTransaction.js';

describe('restart transaction ordering', () => {
  it('stops compute, atomically commits staged configuration, rebuilds, then restarts compute', () => {
    const order = [];
    const result = runRestartTransaction({
      stopCompute: () => order.push('stop'),
      commitConfiguration: () => { order.push('commit'); return { speciesCount: 4 }; },
      resetWorld: ({ speciesCount }) => order.push(`reset:${speciesCount}`),
      spawn: ({ speciesCount }) => order.push(`spawn:${speciesCount}`),
      startCompute: () => order.push('start'),
      finish: () => order.push('finish'),
    });

    expect(order).toEqual(['stop', 'commit', 'reset:4', 'spawn:4', 'start', 'finish']);
    expect(result).toEqual({ speciesCount: 4 });
  });

  it('still runs reset/spawn hooks with an empty commit result', () => {
    const order = [];
    runRestartTransaction({
      commitConfiguration: () => undefined,
      resetWorld: () => order.push('reset'),
      spawn: () => order.push('spawn'),
    });
    expect(order).toEqual(['reset', 'spawn']);
  });
});
