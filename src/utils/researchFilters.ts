import type { FieldResearchTask } from '../types/scrapedDuck';
import { getResearchTypeLabel } from './scrapedDuckLocalization';

export const RESEARCH_FILTER_ALL = 'all' as const;
export const RESEARCH_FILTER_OTHER = 'other' as const;

export type ResearchFilter =
  | typeof RESEARCH_FILTER_ALL
  | typeof RESEARCH_FILTER_OTHER
  | `type:${string}`;

export interface ResearchFilterOption {
  value: ResearchFilter;
  label: string;
}

const RESEARCH_TYPE_ORDER = [
  'event',
  'catch',
  'throw',
  'battle',
  'explore',
  'training',
  'rocket',
  'buddy',
  'ar',
  'sponsored',
] as const;

function researchTypeFilterValue(type: string): ResearchFilter {
  return `type:${type}`;
}

function researchTypeOrder(type: string): number {
  const index = RESEARCH_TYPE_ORDER.indexOf(
    type.toLowerCase() as (typeof RESEARCH_TYPE_ORDER)[number],
  );
  return index < 0 ? RESEARCH_TYPE_ORDER.length : index;
}

export function buildResearchFilterOptions(
  tasks: readonly FieldResearchTask[],
): ResearchFilterOption[] {
  const types = new Map<string, number>();
  let hasOther = false;

  for (const task of tasks) {
    const type = task.type?.trim();
    if (!type) {
      hasOther = true;
    } else if (!types.has(type)) {
      types.set(type, types.size);
    }
  }

  const sortedTypes = [...types.entries()]
    .sort(([left, leftIndex], [right, rightIndex]) => (
      researchTypeOrder(left) - researchTypeOrder(right) || leftIndex - rightIndex
    ))
    .map(([type]) => type);

  const options: ResearchFilterOption[] = [
    { value: RESEARCH_FILTER_ALL, label: 'すべて' },
    ...sortedTypes.map((type) => ({
      value: researchTypeFilterValue(type),
      label: getResearchTypeLabel(type),
    })),
  ];
  if (hasOther) options.push({ value: RESEARCH_FILTER_OTHER, label: 'その他' });
  return options;
}

export function resolveResearchFilter(
  filter: ResearchFilter,
  options: readonly ResearchFilterOption[],
): ResearchFilter {
  return options.some((option) => option.value === filter) ? filter : RESEARCH_FILTER_ALL;
}

export function filterResearchTasks(
  tasks: readonly FieldResearchTask[],
  filter: ResearchFilter,
): FieldResearchTask[] {
  if (filter === RESEARCH_FILTER_ALL) return [...tasks];
  if (filter === RESEARCH_FILTER_OTHER) {
    return tasks.filter((task) => !task.type?.trim());
  }

  const selectedType = filter.slice('type:'.length);
  return tasks.filter((task) => task.type?.trim() === selectedType);
}
