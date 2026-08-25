import type { RaidFilter } from '../utils/raidClassification';
import { FilterChips, type FilterChipOption } from './FilterChips';

const RAID_FILTER_OPTIONS: readonly FilterChipOption<RaidFilter>[] = [
  { value: 'all', label: 'すべて' },
  { value: 'five', label: '★5レイド' },
  { value: 'mega', label: 'メガレイド' },
  { value: 'three', label: '★3レイド' },
  { value: 'one', label: '★1レイド' },
];

interface RaidFiltersProps {
  selected: RaidFilter;
  onChange(filter: RaidFilter): void;
}

export function RaidFilters({ selected, onChange }: RaidFiltersProps) {
  return (
    <FilterChips
      ariaLabel="レイド種類フィルター"
      className="raid-filters"
      options={RAID_FILTER_OPTIONS}
      selected={selected}
      onChange={onChange}
    />
  );
}
