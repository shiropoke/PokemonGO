import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import { parseEventSummary } from './eventDetails';

function eventWith(extraData: unknown): ScrapedDuckEvent {
  return {
    eventID: 'test-event',
    name: 'Test Event',
    eventType: 'event',
    heading: 'Event',
    link: null,
    image: null,
    start: null,
    end: null,
    extraData,
  };
}

describe('parseEventSummary', () => {
  it.each([null, undefined, 'unexpected', 42, [], { future: { value: true } }])(
    'safely ignores missing or unknown extraData: %j',
    (extraData) => {
      expect(parseEventSummary(eventWith(extraData))).toEqual({
        bonuses: [],
        pokemon: [],
        other: [],
      });
    },
  );

  it('reads the current spotlight and generic structures', () => {
    const summary = parseEventSummary(
      eventWith({
        spotlight: {
          name: 'Mankey',
          canBeShiny: true,
          bonus: '2× Catch Candy',
          list: [{ name: 'Mankey', canBeShiny: true }],
        },
        generic: { hasSpawns: true, hasFieldResearchTasks: false },
      }),
    );

    expect(summary.bonuses).toEqual(['2× Catch Candy']);
    expect(summary.pokemon).toEqual(['マンキー（色違いの可能性あり）']);
    expect(summary.other).toEqual(['野生出現あり']);
  });

  it('reads raid bosses, merges shiny information, and removes duplicates', () => {
    const summary = parseEventSummary(
      eventWith({
        raidbattles: {
          bosses: [{ name: 'Lunala', canBeShiny: false }],
          shinies: [{ name: 'Lunala' }],
        },
      }),
    );

    expect(summary.pokemon).toEqual(['ルナアーラ（色違いの可能性あり）']);
  });

  it('reads the documented community day structure without rendering markup', () => {
    const summary = parseEventSummary(
      eventWith({
        communityday: {
          spawns: [{ name: 'Deino' }],
          shinies: [{ name: 'Deino' }],
          bonuses: [{ text: '<strong>1/4</strong> Egg Hatch Distance' }],
          bonusDisclaimers: ['* Available during event hours.'],
        },
        generic: { hasSpawns: true, hasFieldResearchTasks: true },
      }),
    );

    expect(summary.bonuses).toEqual(['1/4 Egg Hatch Distance']);
    expect(summary.pokemon).toEqual(['モノズ（色違いの可能性あり）']);
    expect(summary.other).toEqual([
      '* Available during event hours.',
      '野生出現あり',
      'フィールドリサーチあり',
    ]);
  });
});
