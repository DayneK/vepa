/** Run the restart phases in a single deterministic order. */
export function runRestartTransaction({
  stopCompute,
  commitConfiguration,
  resetWorld,
  spawn,
  startCompute,
  finish,
}) {
  stopCompute?.();
  const applied = commitConfiguration?.() ?? {};
  resetWorld?.(applied);

  spawn?.(applied);
  startCompute?.(applied);
  finish?.(applied);
  return applied;
}
