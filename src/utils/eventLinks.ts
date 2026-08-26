import type { ScrapedDuckEvent } from '../types/events';

export interface EventJapaneseLinkEntry {
  eventID: string;
  eventName: string;
  eventType: string;
  start: string | null;
  end: string | null;
  officialJapaneseUrl: string;
  officialEnglishUrl: string;
  officialTitleJapanese: string;
  officialTitleEnglish: string;
  confidence: 'high';
  matchReason: string;
}

export function isJapanesePokemonGoNewsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'pokemongo.com'
      && url.pathname.startsWith('/ja/news/');
  } catch {
    return false;
  }
}

function createEventLinkKey(event: Pick<
  ScrapedDuckEvent,
  'eventID' | 'name' | 'eventType' | 'start' | 'end'
>): string {
  return JSON.stringify([
    event.eventID,
    event.name,
    event.eventType,
    event.start,
    event.end,
  ]);
}

export function applyJapaneseEventLinks(
  events: ScrapedDuckEvent[],
  entries: EventJapaneseLinkEntry[],
): ScrapedDuckEvent[] {
  const links = new Map(
    entries.map((entry) => [
      createEventLinkKey({
        eventID: entry.eventID,
        name: entry.eventName,
        eventType: entry.eventType,
        start: entry.start,
        end: entry.end,
      }),
      entry.officialJapaneseUrl,
    ]),
  );

  return events.map((event) => ({
    ...event,
    officialJapaneseUrl:
      links.get(createEventLinkKey(event)) ?? event.officialJapaneseUrl,
  }));
}

export function getPreferredEventUrl(event: ScrapedDuckEvent): string | null {
  return event.officialJapaneseUrl ?? event.link;
}
