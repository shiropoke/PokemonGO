import type { EventCategory } from "../types/events";
import { getEventCategoryLabel } from "../utils/eventLocalization";
import { FilterChips } from "./FilterChips";

const FILTER_OPTIONS: readonly EventCategory[] = [
  "all",
  "community-day",
  "spotlight-hour",
  "raid",
  "research",
  "battle-league",
  "rocket",
  "other",
];

interface EventFiltersProps {
  selected: EventCategory;
  onChange: (category: EventCategory) => void;
}

export function EventFilters({ selected, onChange }: EventFiltersProps) {
  return (
    <FilterChips
      ariaLabel="イベント種類フィルター"
      className="event-filters"
      options={FILTER_OPTIONS.map((category) => ({
        value: category,
        label: getEventCategoryLabel(category),
      }))}
      selected={selected}
      onChange={onChange}
    />
  );
}
