import type { EventsFetchResult, ScrapedDuckEvent } from "../types/events";
import type { DatasetLoadOptions } from '../types/scrapedDuck';
import { applyJapaneseEventLinks } from '../utils/eventLinks';
import { EVENTS_CACHE_KEY } from './appStorage';
import { loadEventJapaneseLinks } from './eventJapaneseLinks';

export const SCRAPED_DUCK_EVENTS_URL =
  "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";
export const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;

const CACHE_VERSION = 1;
let inFlightRequest: {
  forceRefresh: boolean;
  promise: Promise<EventsFetchResult>;
} | null = null;

interface EventsCacheRecord {
  version: number;
  fetchedAt: number;
  events: ScrapedDuckEvent[];
}

export class EventsFetchError extends Error {
  constructor(message = "イベント情報を取得できませんでした") {
    super(message);
    this.name = "EventsFetchError";
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEvent(value: unknown, index: number): ScrapedDuckEvent | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const suppliedName = optionalString(candidate.name);
  const heading = optionalString(candidate.heading);
  const start = optionalString(candidate.start);
  const end = optionalString(candidate.end);
  const name = suppliedName ?? heading ?? "名称未設定のイベント";
  const suppliedId = optionalString(candidate.eventID);
  const fallbackId = [name, start ?? "no-start", end ?? "no-end", index].join("-");

  return {
    eventID: suppliedId ?? fallbackId,
    name,
    eventType: optionalString(candidate.eventType) ?? "unknown",
    heading,
    link: optionalString(candidate.link),
    officialJapaneseUrl: null,
    image: optionalString(candidate.image),
    start,
    end,
    extraData: candidate.extraData ?? null,
  };
}

function normalizeEvents(value: unknown): ScrapedDuckEvent[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const events = value
    .map((event, index) => normalizeEvent(event, index))
    .filter((event): event is ScrapedDuckEvent => event !== null);

  // An empty source array is valid, while a non-empty array containing no event
  // objects indicates an unexpected response and must not replace a good cache.
  if (value.length > 0 && events.length === 0) {
    return null;
  }

  return events;
}

function readEventsCache(): EventsCacheRecord | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const serialized = storage.getItem(EVENTS_CACHE_KEY);
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as Partial<EventsCacheRecord>;
    const events = normalizeEvents(parsed.events);
    if (
      parsed.version !== CACHE_VERSION ||
      typeof parsed.fetchedAt !== "number" ||
      !Number.isFinite(parsed.fetchedAt) ||
      !events
    ) {
      return null;
    }

    return {
      version: CACHE_VERSION,
      fetchedAt: parsed.fetchedAt,
      events,
    };
  } catch {
    return null;
  }
}

function writeEventsCache(record: EventsCacheRecord): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(EVENTS_CACHE_KEY, JSON.stringify(record));
  } catch {
    // Private browsing and storage quotas can make localStorage unavailable.
    // The fetched data remains usable for the current page session.
  }
}

function isFresh(record: EventsCacheRecord, now: number): boolean {
  const age = now - record.fetchedAt;
  return age >= 0 && age < EVENTS_CACHE_TTL_MS;
}

async function fetchEventsFromNetwork(
  forceRefresh = false,
): Promise<EventsFetchResult> {
  const response = await fetch(SCRAPED_DUCK_EVENTS_URL, {
    cache: forceRefresh ? 'no-store' : 'default',
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new EventsFetchError();
  }

  const events = normalizeEvents(await response.json());
  if (!events) {
    throw new EventsFetchError();
  }

  const fetchedAt = Date.now();
  writeEventsCache({
    version: CACHE_VERSION,
    events,
    fetchedAt,
  });

  return {
    events,
    fetchedAt,
    source: "network",
    stale: false,
  };
}

function getNetworkRequest(forceRefresh = false): Promise<EventsFetchResult> {
  if (inFlightRequest && (!forceRefresh || inFlightRequest.forceRefresh)) {
    return inFlightRequest.promise;
  }

  const promise = inFlightRequest
    ? inFlightRequest.promise
        .catch(() => undefined)
        .then(() => fetchEventsFromNetwork(true))
    : fetchEventsFromNetwork(forceRefresh);
  const record = { forceRefresh, promise };
  inFlightRequest = record;
  const clear = () => {
    if (inFlightRequest === record) inFlightRequest = null;
  };
  void promise.then(clear, clear);
  return promise;
}

async function loadEventsDataset(
  options: DatasetLoadOptions,
): Promise<EventsFetchResult> {
  const { signal } = options;
  const cached = readEventsCache();
  const now = Date.now();

  if (cached && isFresh(cached, now) && !options.forceRefresh) {
    return {
      events: cached.events,
      fetchedAt: cached.fetchedAt,
      source: "cache",
      stale: false,
    };
  }

  try {
    const networkResult = await getNetworkRequest(options.forceRefresh);
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    return networkResult;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    if (cached) {
      return {
        events: cached.events,
        fetchedAt: cached.fetchedAt,
        source: "cache",
        stale: true,
      };
    }

    throw error instanceof EventsFetchError
      ? error
      : new EventsFetchError();
  }
}

export async function loadEvents(
  options: DatasetLoadOptions = {},
): Promise<EventsFetchResult> {
  const result = await loadEventsDataset(options);
  try {
    const entries = await loadEventJapaneseLinks(options);
    return {
      ...result,
      events: applyJapaneseEventLinks(result.events, entries),
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return result;
  }
}
