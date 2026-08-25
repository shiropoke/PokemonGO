import { describe, expect, it } from 'vitest';
import { rankingMatchesQuery } from './PvpRankingsPage';

const pikachu = {
  displayName: 'ピカチュウ',
  speciesName: 'Pikachu',
  speciesId: 'pikachu',
};

describe('PvPランキング検索', () => {
  it.each(['ピカチュウ', 'ぴかちゅう', 'pikachu', 'pikatyu'])(
    '%s で同じポケモンを絞り込める',
    (query) => {
      expect(rankingMatchesQuery(query, pikachu)).toBe(true);
    },
  );

  it('英語名とspeciesIdの検索を維持する', () => {
    expect(rankingMatchesQuery('Pikachu', pikachu)).toBe(true);
    expect(rankingMatchesQuery('pikachu', pikachu)).toBe(true);
    expect(rankingMatchesQuery('フシギバナ', pikachu)).toBe(false);
  });
});
