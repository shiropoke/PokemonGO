import { describe, expect, it } from 'vitest';
import { POKEMON_TYPES } from '../types/gameData';
import {
  TYPE_META,
  getTypeLabelJa,
  getTypeMeta,
  normalizeTypeKey,
} from './typeMeta';

const EXPECTED_LABELS = {
  normal: 'ノーマル',
  fighting: 'かくとう',
  flying: 'ひこう',
  poison: 'どく',
  ground: 'じめん',
  rock: 'いわ',
  bug: 'むし',
  ghost: 'ゴースト',
  steel: 'はがね',
  fire: 'ほのお',
  water: 'みず',
  grass: 'くさ',
  electric: 'でんき',
  psychic: 'エスパー',
  ice: 'こおり',
  dragon: 'ドラゴン',
  dark: 'あく',
  fairy: 'フェアリー',
} as const;

describe('typeMeta', () => {
  it('18タイプすべてに一意な画像・日本語名・色を対応付ける', () => {
    expect(Object.keys(TYPE_META).sort()).toEqual([...POKEMON_TYPES].sort());
    expect(Object.keys(TYPE_META)).toHaveLength(18);

    const icons = POKEMON_TYPES.map((type) => TYPE_META[type].icon);
    const textColors = POKEMON_TYPES.map((type) => TYPE_META[type].textColor);
    expect(new Set(icons).size).toBe(18);
    expect(new Set(textColors).size).toBe(18);

    for (const type of POKEMON_TYPES) {
      const meta = TYPE_META[type];
      expect(meta.key).toBe(type);
      expect(meta.labelJa).toBe(EXPECTED_LABELS[type]);
      expect(meta.icon).toBeTruthy();
      expect(meta.representativeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.textColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.textColorDark).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('添付画像の代表色と日本語ラベルを共通resolverから返す', () => {
    expect(TYPE_META.fire.representativeColor).toBe('#FD8E2D');
    expect(TYPE_META.water.representativeColor).toBe('#43ABF7');
    expect(TYPE_META.fairy.representativeColor).toBe('#F47AE7');
    expect(getTypeLabelJa(' WATER ')).toBe('みず');
    expect(normalizeTypeKey(' Fairy ')).toBe('fairy');
  });

  it('未知タイプは画像を捏造せず安全に元の表示へフォールバックする', () => {
    expect(getTypeMeta(' Mystery ')).toMatchObject({
      key: 'mystery',
      labelJa: 'Mystery',
      icon: null,
    });
    expect(getTypeMeta('')).toMatchObject({ key: 'unknown', labelJa: '不明' });
  });
});
