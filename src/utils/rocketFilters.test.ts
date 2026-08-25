import { describe, expect, it } from 'vitest';
import type { RocketLineup } from '../types/scrapedDuck';
import {
  buildRocketDialogueOptions,
  buildRocketTypeOptions,
  filterRocketLineups,
  lineupMatches,
  ROCKET_DIALOGUE_ALL,
  ROCKET_TYPE_ALL,
} from './rocketFilters';

function lineup(id: string, type: string | null, dialogue: string, pokemon = ''): RocketLineup {
  return {
    id,
    name: id,
    displayName: id,
    title: 'Team GO Rocket Grunt',
    titleLabel: 'したっぱ',
    type,
    dialogues: [dialogue],
    firstPokemon: pokemon ? [{
      id: pokemon,
      name: pokemon,
      displayName: pokemon,
      image: null,
      types: type ? [type] : [],
      isEncounter: false,
      canBeShiny: false,
    }] : [],
    secondPokemon: [],
    thirdPokemon: [],
  };
}

const fire = lineup('fire', 'fire', '炎のセリフ', 'ヒトカゲ');
const water = lineup('water', 'water', '水のセリフ', 'コイキング');
const waterOther = lineup('water-other', 'water', '別の水セリフ', 'ゼニガメ');
const none = lineup('leader', null, 'リーダーのセリフ');
const lineups = [fire, water, waterOther, none];

describe('Rocket dedicated filters', () => {
  it('存在タイプを共通順で生成し、タイプなしを実データから追加する', () => {
    expect(buildRocketTypeOptions(lineups).map((option) => option.value))
      .toEqual(['all', 'fire', 'water', 'none']);
    expect(buildRocketDialogueOptions(lineups)).toEqual([
      '炎のセリフ', '水のセリフ', '別の水セリフ', 'リーダーのセリフ',
    ]);
  });

  it.each([
    [ROCKET_TYPE_ALL, 4],
    ['fire', 1],
    ['water', 2],
  ])('type=%sを絞り込む', (type, count) => {
    expect(filterRocketLineups(lineups, { query: '', type, dialogue: ROCKET_DIALOGUE_ALL }))
      .toHaveLength(count);
  });

  it('セリフ完全一致とtypeをANDで適用する', () => {
    expect(filterRocketLineups(lineups, {
      query: '',
      type: 'water',
      dialogue: '水のセリフ',
    })).toEqual([water]);
  });

  it('query + type + dialogueを3条件ANDで適用し、全解除で全件へ戻る', () => {
    expect(filterRocketLineups(lineups, {
      query: 'コイキング',
      type: 'water',
      dialogue: '水のセリフ',
    })).toEqual([water]);
    expect(filterRocketLineups(lineups, {
      query: 'ヒトカゲ',
      type: 'water',
      dialogue: '水のセリフ',
    })).toEqual([]);
    expect(filterRocketLineups(lineups, {
      query: '',
      type: ROCKET_TYPE_ALL,
      dialogue: ROCKET_DIALOGUE_ALL,
    })).toEqual(lineups);
  });

  it('既存検索で日本語セリフの一部・ポケモン名・タイプを検索できる', () => {
    expect(lineupMatches(water, '水の')).toBe(true);
    expect(lineupMatches(water, 'コイキング')).toBe(true);
    expect(lineupMatches(water, 'みず')).toBe(true);
    expect(lineupMatches(water, '炎の')).toBe(false);
  });
});
