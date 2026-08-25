export interface FilterChipOption<Value extends string> {
  value: Value;
  label: string;
}

interface FilterChipsProps<Value extends string> {
  ariaLabel: string;
  className?: string;
  options: readonly FilterChipOption<Value>[];
  selected: Value;
  onChange(value: Value): void;
}

export function FilterChips<Value extends string>({
  ariaLabel,
  className,
  options,
  selected,
  onChange,
}: FilterChipsProps<Value>) {
  const classes = ['filter-chips', className].filter(Boolean).join(' ');

  return (
    <div className={classes} aria-label={ariaLabel} data-horizontal-scroll>
      <div className="filter-chips__scroller" role="group" data-horizontal-scroll>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              className={`filter-chips__button${active ? ' is-active' : ''}`}
              data-active={active}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              key={option.value}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
