import { describe, expect, it } from 'vitest';
import { getTypeEffectiveness, getTypeWeaknesses } from './typeEffectiveness';

describe('type effectiveness compatibility helpers', () => {
  it('単弱点と二重弱点をPokémon GO倍率で計算する', () => {
    expect(getTypeEffectiveness('fire', ['grass'])).toBe(1.6);
    expect(getTypeEffectiveness('grass', ['water', 'ground'])).toBeCloseTo(2.56);
  });

  it('無効相当の倍率と日本語弱点ラベルを返す', () => {
    expect(getTypeEffectiveness('electric', ['ground'])).toBe(0.390625);
    expect(getTypeWeaknesses(['ground']).map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['くさ', 'こおり', 'みず']),
    );
  });
});
