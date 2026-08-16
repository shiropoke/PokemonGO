import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTS_CACHE_TTL_MS, loadEvents } from './events';

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const sourceEvent = {
  eventID: 'test-event',
  name: 'Test Event',
  eventType: 'event',
  heading: 'Event',
  link: 'https://leekduck.com/events/test-event/',
  image: null,
  start: '2026-08-16T10:00:00.000',
  end: '2026-08-16T20:00:00.000',
  extraData: null,
};

function successfulResponse(): Response {
  return new Response(JSON.stringify([sourceEvent]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('event data cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    vi.stubGlobal('window', { localStorage: createStorage() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not access the network again during the five-minute cache window', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse());
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadEvents();
    vi.advanceTimersByTime(EVENTS_CACHE_TTL_MS - 1);
    const second = await loadEvents();

    expect(first.source).toBe('network');
    expect(second.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses an expired cache when the next network request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulResponse())
      .mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadEvents();
    vi.advanceTimersByTime(EVENTS_CACHE_TTL_MS);
    const fallback = await loadEvents();

    expect(first.events).toHaveLength(1);
    expect(fallback.source).toBe('cache');
    expect(fallback.stale).toBe(true);
    expect(fallback.events[0]?.eventID).toBe('test-event');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
