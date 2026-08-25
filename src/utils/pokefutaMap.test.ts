import { describe, expect, it } from 'vitest';
import type { Pokefuta } from '../types/pokefuta';
import {
  createPokefutaMapBounds,
  createPokefutaMapPoints,
  getPokefutaGoogleMapUrl,
  POKEFUTA_MAP_MAX_ZOOM,
} from './pokefutaMap';

function createLid(index: number, overrides: Partial<Pokefuta> = {}): Pokefuta {
  return {
    id: String(index),
    prefecture: '大阪府',
    prefectureCode: 27,
    prefectureSlug: 'osaka',
    region: '近畿',
    municipality: `市区町村${index}`,
    locationName: `設置場所${index}`,
    pokemonNames: [`ポケモン${index}`],
    address: `大阪府の住所${index}`,
    imageUrl: null,
    officialUrl: `https://local.pokemon.jp/manhole/desc/${index}/`,
    mapUrl: null,
    latitude: 34.6 + index / 1000,
    longitude: 135.5 + index / 1000,
    ...overrides,
  };
}

describe('ポケふた地図データ', () => {
  it('3地点から3個のマーカー用pointを生成する', () => {
    expect(createPokefutaMapPoints([createLid(1), createLid(2), createLid(3)]))
      .toHaveLength(3);
  });

  it('50地点を欠落なくマーカー用pointへ変換する', () => {
    const lids = Array.from({ length: 50 }, (_, index) => createLid(index + 1));
    expect(createPokefutaMapPoints(lids)).toHaveLength(50);
  });

  it('座標nullまたは範囲外の地点を除外する', () => {
    const points = createPokefutaMapPoints([
      createLid(1),
      createLid(2, { latitude: null }),
      createLid(3, { longitude: null }),
      createLid(4, { latitude: 91 }),
      createLid(5, { longitude: -181 }),
    ]);
    expect(points.map(({ lid }) => lid.id)).toEqual(['1']);
  });

  it('全座標をfitBoundsへ渡せる緯度・経度配列にする', () => {
    const points = createPokefutaMapPoints([createLid(1), createLid(2), createLid(3)]);
    expect(createPokefutaMapBounds(points)).toEqual(points.map((point) => [
      point.latitude,
      point.longitude,
    ]));
  });

  it('1地点のfitBoundsでも過剰拡大しないmaxZoomを使用する', () => {
    expect(createPokefutaMapPoints([createLid(1)])).toHaveLength(1);
    expect(POKEFUTA_MAP_MAX_ZOOM).toBe(15);
  });

  it('0地点ではマーカー用pointを生成しない', () => {
    expect(createPokefutaMapPoints([])).toEqual([]);
  });

  it('公式mapUrlを優先し、ない場合だけ座標URLを生成する', () => {
    const [officialPoint] = createPokefutaMapPoints([
      createLid(1, { mapUrl: 'https://maps.google.com/?q=official' }),
    ]);
    const [coordinatePoint] = createPokefutaMapPoints([createLid(2)]);
    expect(getPokefutaGoogleMapUrl(officialPoint!)).toBe('https://maps.google.com/?q=official');
    expect(getPokefutaGoogleMapUrl(coordinatePoint!)).toContain('query=34.602,135.502');
  });
});
