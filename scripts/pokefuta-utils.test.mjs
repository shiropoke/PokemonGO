import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { POKEFUTA_PREFECTURES } from './pokefuta-prefectures.mjs';
import {
  extractCoordinates,
  extractDetailIds,
  extractPrefectureLinks,
  isOfficialPokefutaDetailUrl,
  normalizePlainText,
  parsePokefutaDetail,
  toAbsoluteHttpUrl,
} from './pokefuta-utils.mjs';

const osaka = POKEFUTA_PREFECTURES.find(({ slug }) => slug === 'osaka');

describe('Poké Lid generator utilities', () => {
  it('47都道府県の静的metadataを保持する', () => {
    expect(POKEFUTA_PREFECTURES).toHaveLength(47);
    expect(new Set(POKEFUTA_PREFECTURES.map(({ code }) => code)).size).toBe(47);
    expect(POKEFUTA_PREFECTURES[0]?.name).toBe('北海道');
    expect(POKEFUTA_PREFECTURES[46]?.name).toBe('沖縄県');
  });

  it('地方ページの実在する都道府県リンクだけを抽出する', () => {
    const html = '<a href="/manhole/osaka.html">大阪府</a><a href="/manhole/not-prefecture.html">不明</a>';
    expect(extractPrefectureLinks(html, POKEFUTA_PREFECTURES).map(({ slug }) => slug))
      .toEqual(['osaka']);
  });

  it('都道府県ページのdetail IDを重複なく抽出する', () => {
    const html = '<a href="/manhole/desc/12/?is_modal=1"></a><a href="/manhole/desc/12/"></a><a href="/manhole/desc/18/"></a>';
    expect(extractDetailIds(html, osaka).map(({ id }) => id)).toEqual(['12', '18']);
  });

  it('fixtureから自治体・ポケモン名・住所・地図・画像を抽出する', async () => {
    const html = await readFile(new URL('./fixtures/pokefuta-detail.html', import.meta.url), 'utf8');
    const lid = parsePokefutaDetail(html, {
      id: '999',
      prefecture: osaka,
      officialUrl: 'https://local.pokemon.jp/manhole/desc/999/',
    });
    expect(lid).toMatchObject({
      prefecture: '大阪府',
      municipality: '東大阪市',
      locationName: '東大阪市',
      pokemonNames: ['ピカチュウ', 'イーブイ'],
      address: '大阪府東大阪市荒本北1丁目1番1号',
      imageUrl: 'https://local.pokemon.jp/img/p/manhole/example_l.png',
      mapUrl: 'https://maps.google.com/maps?q=34.67933,135.60075',
      latitude: 34.67933,
      longitude: 135.60075,
    });
    expect(lid).not.toHaveProperty('about');
  });

  it('空白を正規化し、URL schemeと公式detail URLを検証する', () => {
    expect(normalizePlainText(' 大阪\u00a0 府\n東大阪市 ')).toBe('大阪 府 東大阪市');
    expect(toAbsoluteHttpUrl('javascript:alert(1)')).toBeNull();
    expect(isOfficialPokefutaDetailUrl('https://local.pokemon.jp/manhole/desc/999/')).toBe(true);
    expect(isOfficialPokefutaDetailUrl('https://example.com/manhole/desc/999/')).toBe(false);
  });

  it('Google Maps URLから安全な座標だけを取得する', () => {
    expect(extractCoordinates('https://maps.google.com/maps?q=34.1,135.2'))
      .toEqual({ latitude: 34.1, longitude: 135.2 });
    expect(extractCoordinates('https://maps.google.com/maps?q=999,999'))
      .toEqual({ latitude: null, longitude: null });
  });
});

