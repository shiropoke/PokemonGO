import { describe, expect, it } from 'vitest';
import type { RocketLineup } from '../types/scrapedDuck';
import { lineupMatches } from './RocketPage';

const lineup: RocketLineup = {
  id: 'grunt-electric',
  name: 'Electric Grunt',
  displayName: 'でんきタイプのしたっぱ',
  title: 'Team GO Rocket Grunt',
  titleLabel: 'したっぱ',
  type: 'electric',
  firstPokemon: [{
    id: 'pikachu',
    name: 'Pikachu',
    displayName: 'ピカチュウ',
    image: null,
    types: ['electric'],
    isEncounter: true,
    canBeShiny: false,
  }],
  secondPokemon: [],
  thirdPokemon: [],
};

describe('GOロケット団検索', () => {
  it.each(['ピカチュウ', 'ぴかちゅう', 'pikachu', 'pikatyu'])(
    '%s でポケモン名を検索できる',
    (query) => {
      expect(lineupMatches(lineup, query)).toBe(true);
    },
  );

  it('役職・タイプ・該当なしを判定する', () => {
    expect(lineupMatches(lineup, 'したっぱ')).toBe(true);
    expect(lineupMatches(lineup, 'でんき')).toBe(true);
    expect(lineupMatches(lineup, 'フシギバナ')).toBe(false);
  });
});
