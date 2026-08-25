import { describe, expect, it } from 'vitest';
import type { Pokefuta } from '../types/pokefuta';
import {
  createPokefutaCsv,
  createPokefutaKml,
  getPokefutaExportFilename,
  getPokefutaExportLids,
} from './pokefutaExport';

function createLid(index: number, overrides: Partial<Pokefuta> = {}): Pokefuta {
  return {
    id: String(index),
    prefecture: '大阪府',
    prefectureCode: 27,
    prefectureSlug: 'osaka',
    region: '近畿',
    municipality: `東大阪市${index}`,
    locationName: `花園中央公園${index}`,
    pokemonNames: ['ピカチュウ', 'イーブイ'],
    address: `大阪府東大阪市、住所${index}`,
    imageUrl: null,
    officialUrl: `https://local.pokemon.jp/manhole/desc/${index}/`,
    mapUrl: null,
    latitude: 34.6 + index / 1000,
    longitude: 135.5 + index / 1000,
    ...overrides,
  };
}

describe('Google マイマップ用CSV', () => {
  it('BOM・ヘッダー・県内の全座標あり地点を出力する', () => {
    const csv = createPokefutaCsv([
      createLid(1),
      createLid(2),
      createLid(3, { latitude: null }),
    ]);
    expect(csv.startsWith('\uFEFFName,Address,Latitude,Longitude,Pokemon,Official URL\r\n'))
      .toBe(true);
    expect(csv).toContain('花園中央公園1');
    expect(csv).toContain('花園中央公園2');
    expect(csv).not.toContain('花園中央公園3');
    expect(getPokefutaExportLids([createLid(1), createLid(2), createLid(3, { latitude: null })]))
      .toHaveLength(2);
  });

  it('カンマ・quote・日本語・緯度経度を安全に保持する', () => {
    const csv = createPokefutaCsv([createLid(1, {
      address: '大阪府東大阪市,「A」\n"広場"',
      latitude: 34.123456,
      longitude: 135.654321,
    })]);
    expect(csv).toContain('"大阪府東大阪市,「A」\n""広場"""');
    expect(csv).toContain('"34.123456","135.654321"');
    expect(csv).toContain('"ピカチュウ・イーブイ"');
  });

  it('外部由来のテキスト列でCSV formula injectionを防ぐ', () => {
    const csv = createPokefutaCsv([createLid(1, {
      locationName: '=SUM(A1:A2)',
      address: '+CMD',
      pokemonNames: ['-危険', '@参照'],
    })]);
    expect(csv).toContain('"\'=SUM(A1:A2)のポケふた');
    expect(csv).toContain('"\'+CMD"');
    expect(csv).toContain('"\'-危険・@参照"');
  });
});

describe('Google マイマップ用KML', () => {
  it('座標あり地点と同数のPlacemarkをlongitude,latitude順で出力する', () => {
    const kml = createPokefutaKml([
      createLid(1, { latitude: 34.123456, longitude: 135.654321 }),
      createLid(2),
      createLid(3, { longitude: null }),
    ]);
    expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(kml.match(/<Placemark>/g)).toHaveLength(2);
    expect(kml).toContain('<coordinates>135.654321,34.123456,0</coordinates>');
    expect(kml).not.toContain('花園中央公園3');
  });

  it('XML特殊文字をescapeし、日本語を保持する', () => {
    const kml = createPokefutaKml([createLid(1, {
      locationName: 'A&B<広場>"東"\'西\'',
      address: '住所 & <確認>',
      pokemonNames: ['ピカチュウ'],
    })]);
    expect(kml).toContain('A&amp;B&lt;広場&gt;&quot;東&quot;&apos;西&apos;');
    expect(kml).toContain('住所: 住所 &amp; &lt;確認&gt;');
    expect(kml).toContain('ポケモン: ピカチュウ');
  });

  it('prefecture slugから安全なファイル名を生成する', () => {
    expect(getPokefutaExportFilename('Osaka', 'csv')).toBe('pokefuta-osaka.csv');
    expect(getPokefutaExportFilename('../大阪', 'kml')).toBe('pokefuta-prefecture.kml');
  });
});
