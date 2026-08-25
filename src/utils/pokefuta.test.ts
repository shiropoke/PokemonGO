import { describe, expect, it } from 'vitest';
import type { Pokefuta, PokefutaPrefecture } from '../types/pokefuta';
import { filterPokefuta, filterPokefutaPrefectures } from './pokefuta';

const sample: Pokefuta[] = [
  {
    id: '1', prefecture: '大阪府', prefectureCode: 27, prefectureSlug: 'osaka', region: '近畿',
    municipality: '東大阪市', locationName: '東大阪市', pokemonNames: ['ピカチュウ', 'イーブイ'],
    address: '大阪府東大阪市荒本北1丁目', imageUrl: null,
    officialUrl: 'https://local.pokemon.jp/manhole/desc/1/', mapUrl: null,
    latitude: null, longitude: null,
  },
  {
    id: '2', prefecture: '北海道', prefectureCode: 1, prefectureSlug: 'hokkaido', region: '北海道・東北',
    municipality: '札幌市', locationName: '札幌市', pokemonNames: ['アローラロコン'],
    address: '北海道札幌市中央区', imageUrl: null,
    officialUrl: 'https://local.pokemon.jp/manhole/desc/2/', mapUrl: null,
    latitude: null, longitude: null,
  },
];

const samplePrefectures: PokefutaPrefecture[] = [
  { code: 27, name: '大阪府', slug: 'osaka', region: '近畿', order: 27, count: 1, installed: true },
  { code: 1, name: '北海道', slug: 'hokkaido', region: '北海道・東北', order: 1, count: 1, installed: true },
];

describe('Poké Lid filters', () => {
  it.each([
    ['ピカチュウ', '1'],
    ['ぴかちゅう', '1'],
    ['pikachu', '1'],
    ['大阪', '1'],
    ['osaka', '1'],
    ['東大阪', '1'],
    ['荒本北', '1'],
  ])('%s で対象ポケふたを検索できる', (query, id) => {
    expect(filterPokefuta(sample, { query, region: 'all', prefectureSlug: null }).map((lid) => lid.id))
      .toEqual([id]);
  });

  it('検索・地方・都道府県をAND条件で適用する', () => {
    expect(filterPokefuta(sample, { query: 'ピカチュウ', region: '近畿', prefectureSlug: 'osaka' }))
      .toHaveLength(1);
    expect(filterPokefuta(sample, { query: 'ピカチュウ', region: '関東', prefectureSlug: 'osaka' }))
      .toHaveLength(0);
  });

  it('地方filterでは該当地方の都道府県だけを返す', () => {
    expect(filterPokefutaPrefectures(samplePrefectures, '近畿').map(({ slug }) => slug))
      .toEqual(['osaka']);
  });
});
