import type { EventsFetchResult, ScrapedDuckEvent } from "../types/events";

export const SCRAPED_DUCK_EVENTS_URL =
  "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";
export const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;

const EVENTS_CACHE_KEY = "pokemon-go-information:events:v1";
const CACHE_VERSION = 1;
let inFlightRequest: Promise<EventsFetchResult> | null = null;

interface EventsCacheRecord {
  version: number;
  fetchedAt: number;
  events: ScrapedDuckEvent[];
}

interface LoadEventsOptions {
  signal?: AbortSignal;
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

async function fetchEventsFromNetwork(): Promise<EventsFetchResult> {
  const response = await fetch(SCRAPED_DUCK_EVENTS_URL, {
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

function getNetworkRequest(): Promise<EventsFetchResult> {
  if (!inFlightRequest) {
    inFlightRequest = fetchEventsFromNetwork().finally(() => {
      inFlightRequest = null;
    });
  }

  return inFlightRequest;
}

export async function loadEvents(
  options: LoadEventsOptions = {},
): Promise<EventsFetchResult> {
  const { signal } = options;
  const cached = readEventsCache();
  const now = Date.now();

  // GitHub Raw 側のキャッシュ負荷を抑えるため、手動操作を含めて取得後
  // 5分間は必ずブラウザキャッシュを使う。
  if (cached && isFresh(cached, now)) {
    return {
      events: cached.events,
      fetchedAt: cached.fetchedAt,
      source: "cache",
      stale: false,
    };
  }

  try {
    const networkResult = await getNetworkRequest();
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
