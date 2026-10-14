function createAbortError() {
  const error = new Error('Application boot was aborted');
  error.name = 'AbortError';
  return error;
}

/**
 * Owns the browser application's outer lifecycle without owning simulation
 * state. The entry module supplies boot and resource cleanup operations; this
 * boundary makes boot idempotent and teardown explicit and testable.
 */
export function createApplicationRuntime({ onPause, onResume, onError } = {}) {
  let state = 'idle';
  let paused = false;
  let startPromise = null;
  let startResult;
  let disposeErrors = [];
  const abortController = new AbortController();
  const disposers = [];

  function disposeResources() {
    const errors = [];
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      const entry = disposers[index];
      if (!entry.active) continue;
      entry.active = false;
      try { entry.dispose(); } catch (error) { errors.push(error); }
    }
    disposers.length = 0;
    return errors;
  }

  function reportDisposeErrors(errors) {
    if (!errors.length) return;
    const error = new AggregateError(errors, 'One or more application resources failed to dispose');
    try { onError?.(error); } catch { /* disposal still attempts every registered resource */ }
  }

  function addDisposer(dispose) {
    if (typeof dispose !== 'function') throw new TypeError('Application disposer must be a function');
    if (state === 'disposed' || state === 'failed') {
      dispose();
      return () => {};
    }
    const entry = { dispose, active: true };
    disposers.push(entry);
    return () => { entry.active = false; };
  }

  function start(startApplication) {
    if (state === 'disposed') return Promise.reject(new Error('Application runtime is disposed'));
    if (startPromise) return startPromise;
    if (typeof startApplication !== 'function') return Promise.reject(new TypeError('Application start function is required'));

    state = 'starting';
    startPromise = Promise.resolve().then(() => {
      if (abortController.signal.aborted) throw createAbortError();
      return startApplication({ signal: abortController.signal });
    }).then((result) => {
      if (abortController.signal.aborted) throw createAbortError();
      startResult = result;
      if (state !== 'disposed') state = 'running';
      return result;
    }).catch((error) => {
      if (state !== 'disposed') {
        state = 'failed';
        const cleanupErrors = disposeResources();
        reportDisposeErrors(cleanupErrors);
      }
      if (error?.name !== 'AbortError' && state !== 'disposed') {
        try { onError?.(error); } catch { /* preserve the original boot failure */ }
      }
      throw error;
    });
    return startPromise;
  }

  function pause() {
    if (state !== 'running' || paused) return false;
    onPause?.();
    paused = true;
    return true;
  }

  function resume({ notify = true } = {}) {
    if (state !== 'running' || !paused) return false;
    if (notify) onResume?.();
    paused = false;
    return true;
  }

  function dispose() {
    if (state === 'disposed') return disposeErrors;
    state = 'disposed';
    paused = false;
    abortController.abort();
    disposeErrors = disposeResources();
    reportDisposeErrors(disposeErrors);
    return disposeErrors;
  }

  return Object.freeze({
    start,
    pause,
    resume,
    dispose,
    addDisposer,
    get state() { return state; },
    get paused() { return paused; },
    get result() { return startResult; },
    get signal() { return abortController.signal; },
  });
}
