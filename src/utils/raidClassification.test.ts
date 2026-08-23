import { describe, expect, it } from 'vitest';
import type { RaidBoss } from '../types/scrapedDuck';
import {
  compareRaidsByTierAndShadow,
  groupRaidsByTier,
} from './raidClassification';

function raid(
  id: string,
  tier: string,
  isShadow: boolean,
  displayName = id,
): RaidBoss {
  return {
    id,
    name: isShadow ? `Shadow ${id}` : id,
    displayName,
    speciesId: null,
    tier,
    isShadow,
    canBeShiny: false,
    types: [],
    combatPower: null,
    boostedWeather: [],
    image: null,
  };
}

describe('レイドtier分類', () => {
  it('通常★5とシャドウ★5を同じtierへまとめ、通常を先にする', () => {
    const groups = groupRaidsByTier([
      raid('shadow-five', '5-Star Raids', true),
      raid('normal-five', '5-Star Raids', false),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'five', title: '★5レイド' });
    expect(groups[0]?.raids.map((entry) => entry.id)).toEqual([
      'normal-five',
      'shadow-five',
    ]);
    expect(groups.some((group) => group.key === 'shadow')).toBe(false);
  });

  it('★3と★1でもシャドウを独立カテゴリにせず、通常の後へ並べる', () => {
    const groups = groupRaidsByTier([
      raid('shadow-three', '3-Star Raids', true),
      raid('normal-one', '1-Star Raids', false),
      raid('shadow-one', '1-Star Raids', true),
      raid('normal-three', '3-Star Raids', false),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['three', 'one']);
    expect(groups[0]?.raids.map((entry) => entry.id)).toEqual([
      'normal-three',
      'shadow-three',
    ]);
    expect(groups[1]?.raids.map((entry) => entry.id)).toEqual([
      'normal-one',
      'shadow-one',
    ]);
  });

  it('メガなど既存tierの順序を維持したまま全体を比較できる', () => {
    const raids = [
      raid('one', '1-Star Raids', false),
      raid('mega', 'Mega Raids', false),
      raid('five', '5-Star Raids', false),
      raid('three', '3-Star Raids', false),
    ].sort(compareRaidsByTierAndShadow);

    expect(raids.map((entry) => entry.id)).toEqual([
      'five',
      'mega',
      'three',
      'one',
    ]);
  });
});
