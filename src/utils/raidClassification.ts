import type { RaidBoss } from '../types/raids';
import { getRaidTierLabel } from './scrapedDuckLocalization';

export interface RaidTierGroup {
  key: string;
  title: string;
  order: number;
  raids: RaidBoss[];
}

export type RaidFilter = 'all' | 'five' | 'mega' | 'three' | 'one' | 'shadow';

interface RaidTierDefinition {
  key: string;
  title: string;
  order: number;
}

const COLLATOR = new Intl.Collator('ja');

/**
 * レイドのメイン分類はtierだけで決める。
 * シャドウはScrapedDuck上でも通常と同じtierを持つため、独立カテゴリにしない。
 */
export function getRaidTierDefinition(raid: RaidBoss): RaidTierDefinition {
  const tierLabel = getRaidTierLabel(raid.tier);
  if (tierLabel === '伝説 / ★5') {
    return { key: 'five', title: '★5レイド', order: 1 };
  }
  if (tierLabel === 'メガ') {
    return { key: 'mega', title: 'メガレイド', order: 2 };
  }
  if (tierLabel === '★3') {
    return { key: 'three', title: '★3レイド', order: 3 };
  }
  if (tierLabel === '★1') {
    return { key: 'one', title: '★1レイド', order: 4 };
  }

  const normalizedTier = raid.tier.trim().toLowerCase();
  return {
    key: `tier:${normalizedTier || 'other'}`,
    title: tierLabel || 'その他',
    order: 5,
  };
}

/** 同じtierでは通常レイドを先、シャドウレイドを後に安定して並べる。 */
export function compareRaidsWithinTier(left: RaidBoss, right: RaidBoss): number {
  const shadowOrder = Number(left.isShadow) - Number(right.isShadow);
  if (shadowOrder !== 0) return shadowOrder;

  const displayNameOrder = COLLATOR.compare(left.displayName, right.displayName);
  if (displayNameOrder !== 0) return displayNameOrder;
  return left.id.localeCompare(right.id);
}

/** ホーム等でも再利用できる、tier→通常/シャドウ順の比較関数。 */
export function compareRaidsByTierAndShadow(left: RaidBoss, right: RaidBoss): number {
  const leftGroup = getRaidTierDefinition(left);
  const rightGroup = getRaidTierDefinition(right);
  const groupOrder = leftGroup.order - rightGroup.order;
  if (groupOrder !== 0) return groupOrder;

  const groupNameOrder = leftGroup.key.localeCompare(rightGroup.key);
  if (groupNameOrder !== 0) return groupNameOrder;
  return compareRaidsWithinTier(left, right);
}

export function groupRaidsByTier(raids: readonly RaidBoss[]): RaidTierGroup[] {
  const grouped = new Map<string, RaidTierGroup>();

  for (const raid of raids) {
    const definition = getRaidTierDefinition(raid);
    const group = grouped.get(definition.key);
    if (group) {
      group.raids.push(raid);
    } else {
      grouped.set(definition.key, { ...definition, raids: [raid] });
    }
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      raids: group.raids.sort(compareRaidsWithinTier),
    }))
    .sort((left, right) => {
      const order = left.order - right.order;
      return order !== 0 ? order : left.key.localeCompare(right.key);
    });
}

export function filterRaidTierGroups(
  groups: readonly RaidTierGroup[],
  filter: RaidFilter,
): RaidTierGroup[] {
  if (filter === 'all') return [...groups];
  if (filter !== 'shadow') return groups.filter((group) => group.key === filter);

  return groups
    .map((group) => ({
      ...group,
      raids: group.raids.filter((raid) => raid.isShadow),
    }))
    .filter((group) => group.raids.length > 0);
}

export function resolveRaidFilterForTarget(
  currentFilter: RaidFilter,
  targetRaidId: string | null,
): RaidFilter {
  return targetRaidId ? 'all' : currentFilter;
}
