import type { EggHatch } from '../types/scrapedDuck';

export const EGG_FILTER_ALL = 'all' as const;
export const EGG_FILTER_ADVENTURE_SYNC = 'adventure-sync' as const;

export type EggFilter =
  | typeof EGG_FILTER_ALL
  | typeof EGG_FILTER_ADVENTURE_SYNC
  | `egg:${string}`;

export interface EggFilterOption {
  value: EggFilter;
  label: string;
}

export interface EggDisplayGroups {
  distanceGroups: Array<[string, EggHatch[]]>;
  adventureSync: EggHatch[];
}

function eggTypeFilterValue(eggType: string): EggFilter {
  return `egg:${eggType}`;
}

function distanceFromEggType(eggType: string): number | null {
  const match = eggType.match(/^\s*(\d+(?:\.\d+)?)\s*km(?:\s|$)/i);
  if (!match) return null;
  const distance = Number(match[1]);
  return Number.isFinite(distance) ? distance : null;
}

/** 数値距離は昇順、距離を解釈できない値は入力時の順序を維持して末尾へ置く。 */
export function sortEggTypes(eggTypes: readonly string[]): string[] {
  return eggTypes
    .map((eggType, index) => ({ eggType, index, distance: distanceFromEggType(eggType) }))
    .sort((left, right) => {
      if (left.distance !== null && right.distance !== null) {
        return left.distance - right.distance || left.index - right.index;
      }
      if (left.distance !== null) return -1;
      if (right.distance !== null) return 1;
      return left.index - right.index;
    })
    .map(({ eggType }) => eggType);
}

export function groupEggsForDisplay(eggs: readonly EggHatch[]): EggDisplayGroups {
  const regular = new Map<string, EggHatch[]>();
  const adventureSync: EggHatch[] = [];

  for (const egg of eggs) {
    if (egg.isAdventureSync) {
      adventureSync.push(egg);
      continue;
    }
    regular.set(egg.eggType, [...(regular.get(egg.eggType) ?? []), egg]);
  }

  const distanceGroups = sortEggTypes([...regular.keys()]).map(
    (eggType): [string, EggHatch[]] => [eggType, regular.get(eggType) ?? []],
  );
  return { distanceGroups, adventureSync };
}

export function buildEggFilterOptions(eggs: readonly EggHatch[]): EggFilterOption[] {
  const eggTypes = new Set(eggs.map((egg) => egg.eggType));
  const options: EggFilterOption[] = [
    { value: EGG_FILTER_ALL, label: 'すべて' },
    ...sortEggTypes([...eggTypes]).map((eggType) => ({
      value: eggTypeFilterValue(eggType),
      label: `${eggType}タマゴ`,
    })),
  ];

  if (eggs.some((egg) => egg.isAdventureSync)) {
    options.push({ value: EGG_FILTER_ADVENTURE_SYNC, label: 'いつでも冒険モード' });
  }
  return options;
}

export function resolveEggFilter(
  filter: EggFilter,
  options: readonly EggFilterOption[],
): EggFilter {
  return options.some((option) => option.value === filter) ? filter : EGG_FILTER_ALL;
}

export function filterEggs(eggs: readonly EggHatch[], filter: EggFilter): EggHatch[] {
  if (filter === EGG_FILTER_ALL) return [...eggs];
  if (filter === EGG_FILTER_ADVENTURE_SYNC) {
    return eggs.filter((egg) => egg.isAdventureSync);
  }

  const eggType = filter.slice('egg:'.length);
  return eggs.filter((egg) => !egg.isAdventureSync && egg.eggType === eggType);
}
