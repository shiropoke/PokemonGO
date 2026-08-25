import { describe, expect, it } from 'vitest';
import { TYPE_META } from '../constants/typeMeta';
import { POKEMON_TYPES } from '../types/gameData';
import {
  TYPE_LABELS_JA,
  getTypeEffectiveness,
  getTypeWeaknesses,
} from './typeEffectiveness';

describe('type effectiveness compatibility helpers', () => {
  it('単弱点と二重弱点をポケモン GO倍率で計算する', () => {
    expect(getTypeEffectiveness('fire', ['grass'])).toBe(1.6);
    expect(getTypeEffectiveness('grass', ['water', 'ground'])).toBeCloseTo(2.56);
  });

  it('無効相当の倍率と日本語弱点ラベルを返す', () => {
    expect(getTypeEffectiveness('electric', ['ground'])).toBe(0.390625);
    expect(getTypeWeaknesses(['ground']).map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['くさ', 'こおり', 'みず']),
    );
  });

  it('相性計算の日本語名も共通タイプメタ情報を参照する', () => {
    for (const type of POKEMON_TYPES) {
      expect(TYPE_LABELS_JA[type]).toBe(TYPE_META[type].labelJa);
    }
  });
});
