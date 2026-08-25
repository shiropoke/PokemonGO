import { describe, expect, it } from 'vitest';
import type { RaidBoss } from '../types/scrapedDuck';
import {
  compareRaidsByTierAndShadow,
  filterRaidTierGroups,
  getRaidTierDefinition,
  groupRaidsByTier,
  resolveRaidFilterForTarget,
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
  it.each([
    ['5-Star Raids', 'five', '★5レイド'],
    ['Mega Raids', 'mega', 'メガレイド'],
    ['3-Star Raids', 'three', '★3レイド'],
    ['1-Star Raids', 'one', '★1レイド'],
  ])('%sを既存tier定義の%sへ分類する', (tier, key, title) => {
    expect(getRaidTierDefinition(raid(key, tier, false))).toMatchObject({ key, title });
  });

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

  it.each(['five', 'mega', 'three', 'one'] as const)(
    '%sフィルターでは該当グループだけを返す',
    (filter) => {
      const groups = groupRaidsByTier([
        raid('five', '5-Star Raids', false),
        raid('mega', 'Mega Raids', false),
        raid('three', '3-Star Raids', false),
        raid('one', '1-Star Raids', false),
        raid('other', 'Unknown Tier', false),
      ]);

      expect(filterRaidTierGroups(groups, filter).map((group) => group.key))
        .toEqual([filter]);
    },
  );

  it('allではその他tierを含む既存グループと順序を維持する', () => {
    const groups = groupRaidsByTier([
      raid('other', 'Unknown Tier', false),
      raid('one', '1-Star Raids', false),
      raid('five', '5-Star Raids', false),
    ]);

    expect(filterRaidTierGroups(groups, 'all').map((group) => group.key))
      .toEqual(groups.map((group) => group.key));
  });

  it('shadowでは各tier内のシャドウだけを残し、空グループを除く', () => {
    const groups = groupRaidsByTier([
      raid('normal-five', '5-Star Raids', false),
      raid('shadow-five', '5-Star Raids', true),
      raid('shadow-three', '3-Star Raids', true),
      raid('normal-one', '1-Star Raids', false),
    ]);

    const filtered = filterRaidTierGroups(groups, 'shadow');
    expect(filtered.map((group) => group.key)).toEqual(['five', 'three']);
    expect(filtered.flatMap((group) => group.raids).map((entry) => entry.id))
      .toEqual(['shadow-five', 'shadow-three']);
    expect(filtered.every((group) => group.raids.every((entry) => entry.isShadow))).toBe(true);
  });

  it('tierフィルターでは通常とシャドウの両方を維持する', () => {
    const groups = groupRaidsByTier([
      raid('normal-five', '5-Star Raids', false),
      raid('shadow-five', '5-Star Raids', true),
      raid('shadow-three', '3-Star Raids', true),
    ]);

    expect(filterRaidTierGroups(groups, 'five')[0]?.raids.map((entry) => entry.id))
      .toEqual(['normal-five', 'shadow-five']);
  });

  it('targetRaidIdがあれば選択中フィルターをallへ戻す', () => {
    expect(resolveRaidFilterForTarget('five', 'target-raid')).toBe('all');
    expect(resolveRaidFilterForTarget('shadow', 'target-raid')).toBe('all');
    expect(resolveRaidFilterForTarget('mega', null)).toBe('mega');
  });
});
