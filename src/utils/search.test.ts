import { describe, expect, it } from 'vitest';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { RaidBoss } from '../types/scrapedDuck';
import { searchGlobalData, searchPokemon } from './search';

const pikachu: Pokemon = {
  dex: 25,
  speciesId: 'pikachu',
  speciesName: 'Pikachu',
  displayName: 'ピカチュウ',
  baseStats: { atk: 112, def: 96, hp: 111 },
  released: true,
  tags: [],
  isShadow: false,
};

const costumePikachu: Pokemon = {
  ...pikachu,
  speciesId: 'pikachu_flying_5th_anniv',
  speciesName: 'Pikachu (Flying 5th Anniv)',
  displayName: 'ピカチュウ（そらをとぶ・5周年）',
  form: 'そらをとぶ・5周年',
};

const bulbasaur: Pokemon = {
  ...pikachu,
  dex: 1,
  speciesId: 'bulbasaur',
  speciesName: 'Bulbasaur',
  displayName: 'フシギダネ',
};

const charizard: Pokemon = {
  ...pikachu,
  dex: 6,
  speciesId: 'charizard',
  speciesName: 'Charizard',
  displayName: 'リザードン',
};

const event: ScrapedDuckEvent = {
  eventID: 'pikachu-hour',
  name: 'Pikachu Spotlight Hour',
  eventType: 'pokemon-spotlight-hour',
  heading: null,
  link: null,
  image: null,
  start: '2026-08-25T18:00:00.000',
  end: '2026-08-25T19:00:00.000',
  extraData: null,
};

const raid: RaidBoss = {
  id: 'raid-pikachu-0',
  name: 'Pikachu',
  displayName: 'ピカチュウ',
  speciesId: 'pikachu',
  tier: '1-star raids',
  isShadow: false,
  canBeShiny: true,
  types: ['electric'],
  combatPower: null,
  boostedWeather: [],
  image: null,
};

const source = {
  pokemon: [costumePikachu, pikachu, bulbasaur, charizard],
  events: [event],
  raids: [raid],
};

describe('共通ポケモン検索', () => {
  it('完全一致をフォーム違いの部分一致より先にする', () => {
    expect(searchPokemon(source.pokemon, 'ピカチュウ').map(({ pokemon }) => pokemon.speciesId))
      .toEqual(['pikachu', 'pikachu_flying_5th_anniv']);
  });

  it('部分一致・英語名・speciesId・図鑑番号で検索できる', () => {
    expect(searchPokemon(source.pokemon, 'ピカ')).toHaveLength(2);
    expect(searchPokemon(source.pokemon, 'PIKACHU')[0]?.pokemon.speciesId).toBe('pikachu');
    expect(searchPokemon(source.pokemon, 'pikachu_flying')[0]?.pokemon.speciesId)
      .toBe('pikachu_flying_5th_anniv');
    expect(searchPokemon(source.pokemon, '025')[0]?.pokemon.speciesId).toBe('pikachu');
  });

  it.each(['ピカチュウ', 'ぴかちゅう', 'pikachu', 'pikatyu'])(
    '%s をピカチュウの完全一致相当として検索できる',
    (query) => {
      expect(searchPokemon(source.pokemon, query)[0]?.pokemon.speciesId).toBe('pikachu');
      expect(searchPokemon(source.pokemon, query)[0]?.rank).toBe(0);
    },
  );

  it.each([
    ['ふしぎだね', 'bulbasaur'],
    ['fushigidane', 'bulbasaur'],
    ['りざーどん', 'charizard'],
  ])('%s で日本語名の表記違いを検索できる', (query, speciesId) => {
    expect(searchPokemon(source.pokemon, query)[0]?.pokemon.speciesId).toBe(speciesId);
  });
});

describe('グローバル検索', () => {
  it('ポケモン・イベント・レイドを横断検索する', () => {
    const result = searchGlobalData(source, 'ピカ');
    expect(result.pokemon[0]?.speciesId).toBe('pikachu');
    expect(result.events[0]?.eventID).toBe('pikachu-hour');
    expect(result.raids[0]?.raidId).toBe('raid-pikachu-0');
  });

  it('サイト内ページの別名を検索できる', () => {
    expect(searchGlobalData(source, '強化').pages[0]?.page).toBe('power-up');
    expect(searchGlobalData(source, 'raido').pages[0]?.page).toBe('raids');
    expect(searchGlobalData(source, '連絡').pages[0]?.page).toBe('contact');
    expect(searchGlobalData(source, '問い合わせ').pages[0]?.page).toBe('contact');
  });

  it('該当なしでは全カテゴリが0件になる', () => {
    const result = searchGlobalData(source, '存在しない検索語');
    expect([...result.pokemon, ...result.events, ...result.raids, ...result.pages]).toEqual([]);
  });

  it('空文字では大量のデータを出さず、よく使う機能だけを返す', () => {
    const result = searchGlobalData(source, '　');
    expect(result.pokemon).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.raids).toEqual([]);
    expect(result.pages.map(({ page }) => page)).toEqual([
      'events',
      'raids',
      'iv',
      'pvp-rankings',
    ]);
  });
});
