import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import {
  WEEKLY_EVENT_VIEW_STORAGE_KEY,
  getJapaneseWeekRange,
  getWeeklyEventCalendarSpan,
  getWeeklyEvents,
  groupWeeklyEvents,
  readWeeklyEventView,
  saveWeeklyEventView,
} from './weeklyEvents';

function event(eventID: string, start: string | null, end: string | null): ScrapedDuckEvent {
  return {
    eventID,
    name: eventID,
    eventType: 'event',
    heading: null,
    link: null,
    image: null,
    start,
    end,
    extraData: null,
  };
}

describe('weekly events', () => {
  const reference = new Date(2026, 7, 19, 12);

  it('uses Monday through Sunday as the Japanese week', () => {
    const range = getJapaneseWeekRange(reference);

    expect([range.start.getFullYear(), range.start.getMonth(), range.start.getDate()]).toEqual([
      2026,
      7,
      17,
    ]);
    expect(range.start.getDay()).toBe(1);
    expect([range.end.getFullYear(), range.end.getMonth(), range.end.getDate()]).toEqual([
      2026,
      7,
      24,
    ]);
    expect(range.end.getDay()).toBe(1);
    expect(range.days).toHaveLength(7);
    expect(range.days[6]?.getDay()).toBe(0);
  });

  it('can return the following Monday-through-Sunday range for next week', () => {
    const range = getJapaneseWeekRange(reference, 1);

    expect([range.start.getFullYear(), range.start.getMonth(), range.start.getDate()]).toEqual([
      2026,
      7,
      24,
    ]);
    expect([range.end.getFullYear(), range.end.getMonth(), range.end.getDate()]).toEqual([
      2026,
      7,
      31,
    ]);
  });

  it('includes long-running events overlapping the week and sorts by start', () => {
    const overlapping = event(
      'overlapping',
      '2026-08-10T10:00:00.000',
      '2026-08-18T20:00:00.000',
    );
    const wednesday = event(
      'wednesday',
      '2026-08-19T18:00:00.000',
      '2026-08-19T19:00:00.000',
    );
    const nextWeek = event(
      'next-week',
      '2026-08-24T00:00:00.000',
      '2026-08-24T01:00:00.000',
    );

    expect(getWeeklyEvents([wednesday, nextWeek, overlapping], reference).map(({ eventID }) => eventID)).toEqual([
      'overlapping',
      'wednesday',
    ]);
  });

  it('maps a multi-day event to the corresponding seven-column calendar span', () => {
    const multiDay = event(
      'multi-day',
      '2026-08-18T10:00:00.000',
      '2026-08-21T20:00:00.000',
    );

    expect(getWeeklyEventCalendarSpan(multiDay, reference)).toEqual({
      startColumn: 2,
      endColumn: 6,
    });
  });

  it('filters and maps events using the selected next-week range', () => {
    const nextWeek = event(
      'next-week',
      '2026-08-25T10:00:00.000',
      '2026-08-27T20:00:00.000',
    );
    const thisWeek = event(
      'this-week',
      '2026-08-19T10:00:00.000',
      '2026-08-19T20:00:00.000',
    );

    expect(getWeeklyEvents([thisWeek, nextWeek], reference, 1).map(({ eventID }) => eventID)).toEqual([
      'next-week',
    ]);
    expect(getWeeklyEventCalendarSpan(nextWeek, reference, 1)).toEqual({
      startColumn: 2,
      endColumn: 5,
    });
  });

  it('groups list items by date and orders entries on the same day by start time', () => {
    const evening = event(
      'evening',
      '2026-08-19T18:00:00.000',
      '2026-08-19T19:00:00.000',
    );
    const morning = event(
      'morning',
      '2026-08-19T10:00:00.000',
      '2026-08-19T11:00:00.000',
    );

    const groups = groupWeeklyEvents([evening, morning], reference);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.date.getDate()).toBe(19);
    expect(groups[0]?.events.map(({ eventID }) => eventID)).toEqual([
      'morning',
      'evening',
    ]);
  });

  it('saves and restores list/calendar preference defensively', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(readWeeklyEventView(storage)).toBe('list');
    saveWeeklyEventView('calendar', storage);
    expect(values.get(WEEKLY_EVENT_VIEW_STORAGE_KEY)).toBe('calendar');
    expect(readWeeklyEventView(storage)).toBe('calendar');
    values.set(WEEKLY_EVENT_VIEW_STORAGE_KEY, 'unexpected');
    expect(readWeeklyEventView(storage)).toBe('list');
  });
});
