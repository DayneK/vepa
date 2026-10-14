import { describe, expect, it, vi } from 'vitest';
import { createApplicationRuntime } from '../../src/application/applicationRuntime.js';

describe('application runtime lifecycle', () => {
  it('starts once and shares the in-flight result with repeated callers', async () => {
    const runtime = createApplicationRuntime();
    const start = vi.fn(async () => ({ sessionId: 'session-1' }));

    const first = runtime.start(start);
    const second = runtime.start(start);

    expect(second).toBe(first);
    await expect(first).resolves.toEqual({ sessionId: 'session-1' });
    expect(runtime.state).toBe('running');
    expect(runtime.result).toEqual({ sessionId: 'session-1' });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('allows only valid pause and resume transitions', async () => {
    const runtime = createApplicationRuntime();
    await runtime.start(async () => undefined);

    expect(runtime.pause()).toBe(true);
    expect(runtime.pause()).toBe(false);
    expect(runtime.paused).toBe(true);
    expect(runtime.resume()).toBe(true);
    expect(runtime.resume()).toBe(false);
    expect(runtime.paused).toBe(false);
  });

  it('notifies the running simulation when resume is requested without notification', async () => {
    const onResume = vi.fn();
    const runtime = createApplicationRuntime({ onResume });
    await runtime.start(async () => undefined);
    runtime.pause();

    expect(runtime.resume({ notify: false })).toBe(true);
    expect(runtime.paused).toBe(false);
    expect(onResume).not.toHaveBeenCalled();
  });

  it('disposes owned resources once in reverse registration order', async () => {
    const runtime = createApplicationRuntime();
    const order = [];
    await runtime.start(async () => undefined);
    runtime.addDisposer(() => order.push('worker'));
    runtime.addDisposer(() => order.push('renderer'));
    const removeUi = runtime.addDisposer(() => order.push('ui'));
    removeUi();

    expect(runtime.dispose()).toEqual([]);
    expect(runtime.dispose()).toEqual([]);
    expect(order).toEqual(['renderer', 'worker']);
    expect(runtime.state).toBe('disposed');
    await expect(runtime.start(async () => undefined)).rejects.toThrow('disposed');
  });

  it('attempts remaining cleanup after a disposer fails and reports the aggregate', async () => {
    const onError = vi.fn();
    const runtime = createApplicationRuntime({ onError });
    const later = vi.fn();
    const failure = new Error('renderer teardown');
    await runtime.start(async () => undefined);
    runtime.addDisposer(later);
    runtime.addDisposer(() => { throw failure; });

    const errors = runtime.dispose();
    expect(errors).toEqual([failure]);
    expect(later).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].errors).toEqual([failure]);
  });

  it('aborts boot on disposal and releases resources when startup fails', async () => {
    const runtime = createApplicationRuntime();
    const boot = vi.fn(({ signal }) => new Promise((resolve) => {
      signal.addEventListener('abort', resolve, { once: true });
    }));
    const startup = runtime.start(boot);
    await Promise.resolve();
    runtime.addDisposer(() => undefined);
    runtime.dispose();
    await expect(startup).rejects.toMatchObject({ name: 'AbortError' });
    expect(boot).toHaveBeenCalledOnce();
    expect(runtime.signal.aborted).toBe(true);

    const onError = vi.fn();
    const failedRuntime = createApplicationRuntime({ onError });
    const cleanup = vi.fn();
    const lateCleanup = vi.fn();
    const failure = new Error('boot failed after allocation');
    failedRuntime.addDisposer(cleanup);
    await expect(failedRuntime.start(async () => { throw failure; })).rejects.toBe(failure);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(failedRuntime.state).toBe('failed');
    failedRuntime.addDisposer(lateCleanup);
    expect(lateCleanup).toHaveBeenCalledOnce();
  });

  it('reports a failed start and refuses a second boot attempt', async () => {
    const onError = vi.fn();
    const runtime = createApplicationRuntime({ onError });
    const failure = new Error('boot failed');

    await expect(runtime.start(async () => { throw failure; })).rejects.toBe(failure);
    expect(runtime.state).toBe('failed');
    expect(onError).toHaveBeenCalledWith(failure);
    await expect(runtime.start(async () => undefined)).rejects.toBe(failure);
  });
});
