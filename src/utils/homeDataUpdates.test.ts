import { describe, expect, it } from 'vitest';
import {
  createEmptyHomeDataUpdates,
  formatHomeDataUpdateSummary,
  hasStaleHomeData,
} from './homeDataUpdates';

function localTime(hours: number, minutes: number, seconds = 0): number {
  return new Date(2026, 7, 24, hours, minutes, seconds).getTime();
}

describe('home data update metadata', () => {
  it('uses one time when all updates occurred in the same minute', () => {
    const updates = createEmptyHomeDataUpdates();
    updates.events.fetchedAt = localTime(2, 19, 1);
    updates.raids.fetchedAt = localTime(2, 19, 45);

    expect(formatHomeDataUpdateSummary(updates)).toBe('データ更新 02:19');
  });

  it('shows the oldest through newest update time and ignores missing values', () => {
    const updates = createEmptyHomeDataUpdates();
    updates.events.fetchedAt = localTime(2, 19);
    updates.raids.fetchedAt = localTime(2, 18);
    updates.research.fetchedAt = localTime(2, 17);

    expect(formatHomeDataUpdateSummary(updates)).toBe('データ更新 02:17〜02:19');
  });

  it('returns null when no update time is available', () => {
    expect(formatHomeDataUpdateSummary(createEmptyHomeDataUpdates())).toBeNull();
  });

  it('includes month and day when stale and fresh updates cross midnight', () => {
    const updates = createEmptyHomeDataUpdates();
    updates.events.fetchedAt = new Date(2026, 7, 23, 23, 58).getTime();
    updates.raids.fetchedAt = new Date(2026, 7, 24, 0, 2).getTime();

    expect(formatHomeDataUpdateSummary(updates)).toBe(
      'データ更新 8/23 23:58〜8/24 00:02',
    );
  });

  it('detects stale data in any dataset', () => {
    const updates = createEmptyHomeDataUpdates();
    expect(hasStaleHomeData(updates)).toBe(false);
    updates.eggs.stale = true;
    expect(hasStaleHomeData(updates)).toBe(true);
  });
});
