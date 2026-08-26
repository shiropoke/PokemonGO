import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import {
  applyJapaneseEventLinks,
  getPreferredEventUrl,
  type EventJapaneseLinkEntry,
} from './eventLinks';

const event: ScrapedDuckEvent = {
  eventID: 'water-festival-2026',
  name: 'Ultra Unlock: Water Festival',
  eventType: 'event',
  heading: 'Event',
  link: 'https://leekduck.com/events/water-festival-2026/',
  officialJapaneseUrl: null,
  image: null,
  start: '2026-07-15T10:00:00.000',
  end: '2026-07-20T20:00:00.000',
  extraData: null,
};

const mapping: EventJapaneseLinkEntry = {
  eventID: event.eventID,
  eventName: event.name,
  eventType: event.eventType,
  start: event.start,
  end: event.end,
  officialJapaneseUrl: 'https://pokemongo.com/ja/news/water-festival-2026',
  officialEnglishUrl: 'https://pokemongo.com/news/water-festival-2026',
  officialTitleJapanese: 'ウォーターフェスティバル',
  officialTitleEnglish: 'Water Festival',
  confidence: 'high',
  matchReason: 'exact-title',
};

describe('event Japanese links', () => {
  it('高信頼の対応表があれば日本語公式記事を優先する', () => {
    const [linked] = applyJapaneseEventLinks([event], [mapping]);
    expect(linked?.officialJapaneseUrl).toBe(mapping.officialJapaneseUrl);
    expect(linked && getPreferredEventUrl(linked)).toBe(mapping.officialJapaneseUrl);
  });

  it('対応表がなければLeek Duckリンクを維持する', () => {
    const [unlinked] = applyJapaneseEventLinks([event], []);
    expect(unlinked?.officialJapaneseUrl).toBeNull();
    expect(unlinked && getPreferredEventUrl(unlinked)).toBe(event.link);
  });

  it('eventIDだけが一致しても別名・別期間なら適用しない', () => {
    const ambiguous = { ...mapping, eventName: 'Different Event' };
    const [unlinked] = applyJapaneseEventLinks([event], [ambiguous]);
    expect(unlinked?.officialJapaneseUrl).toBeNull();
  });
});
