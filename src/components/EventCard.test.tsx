import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import { EventCard } from './EventCard';

const baseEvent: ScrapedDuckEvent = {
  eventID: 'community-day',
  name: 'Pikachu Community Day',
  eventType: 'community-day',
  heading: null,
  link: 'https://leekduck.com/events/pikachu-community-day/',
  image: 'https://example.com/pikachu.jpg',
  start: '2026-08-25T10:00:00.000',
  end: '2026-08-25T17:00:00.000',
  extraData: null,
};

describe('EventCard', () => {
  it('安全なeventUrlがある場合は画像と詳細内の両方に外部リンクを表示する', () => {
    const markup = renderToStaticMarkup(
      <EventCard event={baseEvent} status="upcoming" now={Date.parse('2026-08-25T09:00:00.000')} />,
    );

    expect(markup).toContain('class="event-card__media-link"');
    expect(markup).toContain('class="event-card__external"');
    expect(markup.match(/https:\/\/leekduck\.com\/events\/pikachu-community-day\//g))
      .toHaveLength(2);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('class="event-card__details-panel"');
  });

  it('eventUrlがない場合は画像を偽リンクにしない', () => {
    const markup = renderToStaticMarkup(
      <EventCard
        event={{ ...baseEvent, eventID: 'without-link', link: null }}
        status="upcoming"
        now={Date.parse('2026-08-25T09:00:00.000')}
      />,
    );

    expect(markup).not.toContain('class="event-card__media-link"');
    expect(markup).not.toContain('href="#"');
  });
});
