import { describe, expect, it } from 'vitest';
import { shouldRevalidateDataset } from './useCachedDataset';

describe('shouldRevalidateDataset', () => {
  const staleTimeMs = 5 * 60 * 1000;
  const now = Date.parse('2026-08-26T12:00:00.000Z');

  it('keeps data fresh until the stale interval has elapsed', () => {
    expect(shouldRevalidateDataset(now - staleTimeMs + 1, now, staleTimeMs))
      .toBe(false);
  });

  it('revalidates when the stale interval has elapsed', () => {
    expect(shouldRevalidateDataset(now - staleTimeMs, now, staleTimeMs))
      .toBe(true);
  });
});
