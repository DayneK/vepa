import { describe, expect, it } from 'vitest';
import { formatTickStats } from '../../src/ui/hud.js';

describe('HUD telemetry', () => {
  it('keeps total tick count beside the render frame rate', () => {
    expect(formatTickStats(1234, 59.96)).toBe('1,234\n60.0');
  });

  it('normalizes an uninitialized tick value', () => {
    expect(formatTickStats(-1, 0)).toBe('0\n0.0');
  });
});
