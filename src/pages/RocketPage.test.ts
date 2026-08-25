import { describe, expect, it } from 'vitest';
import type { RocketLineup } from '../types/scrapedDuck';
import { lineupMatches } from '../utils/rocketFilters';

const lineup: RocketLineup = {
  id: 'grunt-electric',
  name: 'Electric Grunt',
  displayName: 'でんきタイプのしたっぱ',
  title: 'Team GO Rocket Grunt',
  titleLabel: 'したっぱ',
  type: 'electric',
  dialogues: ['ビリビリ、ってするわよ！ ビリビリ！'],
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

  it('日本語セリフを部分検索でき、旧英語セリフは表示検索対象に残さない', () => {
    expect(lineupMatches(lineup, 'ビリビリ')).toBe(true);
    expect(lineupMatches(lineup, 'するわよ')).toBe(true);
    expect(lineupMatches(lineup, 'READY TO BE SHOCKED')).toBe(false);
  });
});
