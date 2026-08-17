import { describe, expect, it } from 'vitest';
import { parsePvpRankings } from './pvpoke';

function league(cp: number) {
  return {
    cp,
    sourceUrl: `https://example.test/${cp}.json`,
    rankings: [
      {
        speciesId: 'pikachu',
        speciesName: 'Pikachu',
        score: 91.2,
        moveset: ['THUNDER_SHOCK', 'WILD_CHARGE'],
        stats: { product: 1000, atk: 100, def: 100, hp: 100 },
      },
    ],
  };
}

describe('parsePvpRankings', () => {
  it('3リーグの種ランキングと推奨技を防御的に読み込む', () => {
    const parsed = parsePvpRankings({
      generatedAt: '2026-08-17T00:00:00.000Z',
      source: 'PvPoke',
      leagues: {
        great: league(1500),
        ultra: league(2500),
        master: league(10000),
      },
    });

    expect(parsed.leagues.great.rankings).toHaveLength(1);
    expect(parsed.leagues.great.rankings[0]?.speciesId).toBe('pikachu');
    expect(parsed.leagues.great.rankings[0]?.moveset).toEqual([
      'THUNDER_SHOCK',
      'WILD_CHARGE',
    ]);
  });

  it('リーグが欠けたデータを拒否する', () => {
    expect(() =>
      parsePvpRankings({ leagues: { great: league(1500) } }),
    ).toThrow('3リーグ分');
  });
});
