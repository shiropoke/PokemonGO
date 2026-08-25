import { describe, expect, it } from 'vitest';
import { calculateCp } from './cp';
import { getPvpRankResult } from './pvp';
import {
  applyShadowAttackModifier,
  SHADOW_ATTACK_MULTIPLIER,
} from './shadow';

describe('Shadow battle modifier', () => {
  it('攻撃性能の参考値だけへ1.2倍を適用する', () => {
    expect(SHADOW_ATTACK_MULTIPLIER).toBe(1.2);
    expect(applyShadowAttackModifier(15.23)).toBeCloseTo(18.276);
  });

  it('CPとPvP個体値順位はShadow状態に依存しない基礎種族値で計算する', () => {
    const normalStats = { atk: 112, def: 96, hp: 111 };
    const shadowStats = { ...normalStats };
    const ivs = { attack: 0, defense: 15, hp: 15 };

    expect(calculateCp(shadowStats, ivs, 20)).toBe(calculateCp(normalStats, ivs, 20));
    expect(getPvpRankResult(shadowStats, ivs, 'great', 50))
      .toEqual(getPvpRankResult(normalStats, ivs, 'great', 50));
  });
});
