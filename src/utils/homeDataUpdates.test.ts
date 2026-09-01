import { describe, expect, it } from 'vitest';
import {
  createEmptyHomeDataUpdates,
  hasStaleHomeData,
} from './homeDataUpdates';

describe('home data update metadata', () => {
  it('detects stale data in any dataset', () => {
    const updates = createEmptyHomeDataUpdates();
    expect(hasStaleHomeData(updates)).toBe(false);
    updates.eggs.stale = true;
    expect(hasStaleHomeData(updates)).toBe(true);
  });
});
