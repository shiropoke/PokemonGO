import type { EventCategory } from "../types/events";
import { getEventCategoryLabel } from "../utils/eventLocalization";

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
    <div className="event-filters" aria-label="イベント種類フィルター">
      <div className="event-filters__scroller" role="group">
        {FILTER_OPTIONS.map((category) => (
          <button
            className={`event-filters__button${
              selected === category ? " is-active" : ""
            }`}
            data-active={selected === category}
            type="button"
            aria-pressed={selected === category}
            onClick={() => onChange(category)}
            key={category}
          >
            {getEventCategoryLabel(category)}
          </button>
        ))}
      </div>
    </div>
  );
}
