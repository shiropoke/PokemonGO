import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import {
  getEventCategory,
  getEventTimingStatus,
  groupAndSortEvents,
  parseEventDate,
} from './date';

function event(
  eventID: string,
  start: string | null,
  end: string | null,
): ScrapedDuckEvent {
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

describe('ScrapedDuck event dates', () => {
  it('parses a trailing Z as an absolute UTC timestamp', () => {
    expect(parseEventDate('2026-08-18T20:00:00.000Z')?.toISOString()).toBe(
      '2026-08-18T20:00:00.000Z',
    );
  });

  it('parses a timestamp without Z as the browser local time', () => {
    const parsed = parseEventDate('2026-08-18T10:00:00.000');

    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(18);
    expect(parsed?.getHours()).toBe(10);
    expect(parsed?.getMinutes()).toBe(0);
  });

  it('handles null and invalid timestamps without throwing', () => {
    expect(parseEventDate(null)).toBeNull();
    expect(parseEventDate('not-a-date')).toBeNull();
    expect(parseEventDate('2026-02-30T10:00:00.000')).toBeNull();
  });

  it('classifies and sorts ongoing, upcoming, ended and unknown events', () => {
    const now = new Date('2026-08-18T12:00:00.000Z').getTime();
    const earlierEnding = event(
      'ongoing-first',
      '2026-08-18T10:00:00.000Z',
      '2026-08-18T13:00:00.000Z',
    );
    const laterEnding = event(
      'ongoing-second',
      '2026-08-18T09:00:00.000Z',
      '2026-08-18T14:00:00.000Z',
    );
    const upcoming = event(
      'upcoming',
      '2026-08-18T15:00:00.000Z',
      '2026-08-18T16:00:00.000Z',
    );
    const ended = event(
      'ended',
      '2026-08-18T08:00:00.000Z',
      '2026-08-18T11:00:00.000Z',
    );
    const unknown = event('unknown', null, null);
    const groups = groupAndSortEvents(
      [upcoming, laterEnding, unknown, ended, earlierEnding],
      now,
    );

    expect(getEventTimingStatus(earlierEnding, now)).toBe('ongoing');
    expect(groups.ongoing.map(({ eventID }) => eventID)).toEqual([
      'ongoing-first',
      'ongoing-second',
    ]);
    expect(groups.upcoming.map(({ eventID }) => eventID)).toEqual(['upcoming']);
    expect(groups.ended.map(({ eventID }) => eventID)).toEqual(['ended']);
    expect(groups.unknown.map(({ eventID }) => eventID)).toEqual(['unknown']);
  });

  it('maps unknown event types to その他', () => {
    expect(getEventCategory('community-day')).toBe('community-day');
    expect(getEventCategory('raid-weekend')).toBe('raid');
    expect(getEventCategory('future-event-type')).toBe('other');
    expect(getEventCategory(null)).toBe('other');
  });
});
