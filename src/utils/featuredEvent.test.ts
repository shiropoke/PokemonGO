import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import { selectFeaturedEvent } from './featuredEvent';

const NOW = Date.parse('2026-08-24T00:00:00.000Z');

function event(
  eventID: string,
  eventType: string,
  start: string,
  end: string,
  name = eventID,
): ScrapedDuckEvent {
  return {
    eventID,
    name,
    eventType,
    heading: null,
    link: null,
    image: null,
    start,
    end,
    extraData: null,
  };
}

describe('featured event selection', () => {
  it('prioritizes an ongoing major event', () => {
    const regular = event('regular', 'event', '2026-08-23T00:00:00.000Z', '2026-08-25T00:00:00.000Z');
    const fest = event('fest', 'pokemon-go-fest', '2026-08-23T10:00:00.000Z', '2026-08-24T10:00:00.000Z', 'Pokémon GO Fest 2026');

    expect(selectFeaturedEvent([regular, fest], NOW)?.eventID).toBe('fest');
  });

  it('prioritizes Community Day over a regular event', () => {
    const regular = event('regular', 'event', '2026-08-23T00:00:00.000Z', '2026-08-25T00:00:00.000Z');
    const communityDay = event('community', 'community-day', '2026-08-23T23:00:00.000Z', '2026-08-24T03:00:00.000Z', 'Pikachu Community Day');

    expect(selectFeaturedEvent([regular, communityDay], NOW)?.eventID).toBe('community');
  });

  it('does not over-prioritize a recurring one-hour event', () => {
    const regular = event('regular', 'event', '2026-08-23T00:00:00.000Z', '2026-08-25T00:00:00.000Z');
    const raidHour = event('raid-hour', 'raid-hour', '2026-08-23T23:30:00.000Z', '2026-08-24T00:30:00.000Z', 'Lunala Raid Hour');

    expect(selectFeaturedEvent([raidHour, regular], NOW)?.eventID).toBe('regular');
  });

  it('selects a nearby upcoming event when nothing is ongoing', () => {
    const later = event('later', 'event', '2026-08-26T00:00:00.000Z', '2026-08-27T00:00:00.000Z');
    const nearby = event('nearby', 'event', '2026-08-24T04:00:00.000Z', '2026-08-25T00:00:00.000Z');

    expect(selectFeaturedEvent([later, nearby], NOW)?.eventID).toBe('nearby');
  });

  it('allows a major event starting within 30 minutes to outrank an ongoing regular event', () => {
    const regular = event('regular', 'event', '2026-08-23T00:00:00.000Z', '2026-08-25T00:00:00.000Z');
    const fest = event('fest', 'event', '2026-08-24T00:30:00.000Z', '2026-08-25T00:00:00.000Z', 'Pokémon GO Fest Global');

    expect(selectFeaturedEvent([regular, fest], NOW)?.eventID).toBe('fest');
  });

  it('keeps an ongoing regular event ahead of a major event several days away', () => {
    const regular = event('regular', 'event', '2026-08-23T00:00:00.000Z', '2026-08-25T00:00:00.000Z');
    const fest = event('fest', 'pokemon-go-fest', '2026-08-27T00:00:00.000Z', '2026-08-28T00:00:00.000Z', 'Pokémon GO Fest');

    expect(selectFeaturedEvent([fest, regular], NOW)?.eventID).toBe('regular');
  });

  it('returns null when there are no eligible events', () => {
    const ended = event('ended', 'event', '2026-08-22T00:00:00.000Z', '2026-08-23T00:00:00.000Z');
    expect(selectFeaturedEvent([], NOW)).toBeNull();
    expect(selectFeaturedEvent([ended], NOW)).toBeNull();
  });
});
