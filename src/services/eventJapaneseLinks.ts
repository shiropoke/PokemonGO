import type { DatasetLoadOptions } from '../types/scrapedDuck';
import {
  isJapanesePokemonGoNewsUrl,
  type EventJapaneseLinkEntry,
} from '../utils/eventLinks';

const EVENT_JAPANESE_LINKS_URL = `${import.meta.env.BASE_URL}data/event-japanese-links.json`;

let cachedEntries: EventJapaneseLinkEntry[] | null = null;
let inFlightRequest: {
  forceRefresh: boolean;
  promise: Promise<EventJapaneseLinkEntry[]>;
} | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === 'string' ? value : undefined;
}

function normalizeEntry(value: unknown): EventJapaneseLinkEntry | null {
  if (!isRecord(value)) return null;
  const start = nullableString(value.start);
  const end = nullableString(value.end);
  if (
    typeof value.eventID !== 'string'
    || typeof value.eventName !== 'string'
    || typeof value.eventType !== 'string'
    || start === undefined
    || end === undefined
    || typeof value.officialJapaneseUrl !== 'string'
    || !isJapanesePokemonGoNewsUrl(value.officialJapaneseUrl)
    || typeof value.officialEnglishUrl !== 'string'
    || typeof value.officialTitleJapanese !== 'string'
    || typeof value.officialTitleEnglish !== 'string'
    || value.confidence !== 'high'
    || typeof value.matchReason !== 'string'
  ) return null;

  return {
    eventID: value.eventID,
    eventName: value.eventName,
    eventType: value.eventType,
    start,
    end,
    officialJapaneseUrl: value.officialJapaneseUrl,
    officialEnglishUrl: value.officialEnglishUrl,
    officialTitleJapanese: value.officialTitleJapanese,
    officialTitleEnglish: value.officialTitleEnglish,
    confidence: 'high',
    matchReason: value.matchReason,
  };
}

async function requestEntries(forceRefresh: boolean): Promise<EventJapaneseLinkEntry[]> {
  const response = await fetch(EVENT_JAPANESE_LINKS_URL, {
    cache: forceRefresh ? 'no-store' : 'default',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Japanese event links request failed.');
  const value: unknown = await response.json();
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries)) {
    throw new Error('Invalid Japanese event links response.');
  }
  const entries = value.entries
    .map(normalizeEntry)
    .filter((entry): entry is EventJapaneseLinkEntry => entry !== null);
  if (value.entries.length > 0 && entries.length === 0) {
    throw new Error('Japanese event links could not be normalized.');
  }
  cachedEntries = entries;
  return entries;
}

export async function loadEventJapaneseLinks(
  options: DatasetLoadOptions = {},
): Promise<EventJapaneseLinkEntry[]> {
  if (cachedEntries && !options.forceRefresh) return cachedEntries;
  const forceRefresh = Boolean(options.forceRefresh);
  if (!inFlightRequest || (forceRefresh && !inFlightRequest.forceRefresh)) {
    const promise = inFlightRequest
      ? inFlightRequest.promise
          .catch(() => cachedEntries ?? [])
          .then(() => requestEntries(true))
      : requestEntries(forceRefresh);
    const record = { forceRefresh, promise };
    inFlightRequest = record;
    const clear = () => {
      if (inFlightRequest === record) inFlightRequest = null;
    };
    void promise.then(clear, clear);
  }
  try {
    const entries = await inFlightRequest.promise;
    if (options.signal?.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
    return entries;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (cachedEntries) return cachedEntries;
    throw error;
  }
}
