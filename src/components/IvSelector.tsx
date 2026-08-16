import { useId } from 'react';

const IV_VALUES = Array.from({ length: 16 }, (_, index) => index);

export type IvTone = 'attack' | 'defense' | 'hp';

interface IvSelectorProps {
  label: string;
  value: number;
  tone: IvTone;
  onChange: (value: number) => void;
}

export function IvSelector({ label, value, tone, onChange }: IvSelectorProps) {
  const labelId = useId();
  const normalizedValue = Math.min(15, Math.max(0, Math.trunc(value)));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(0, normalizedValue - 1));
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(15, normalizedValue + 1));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      onChange(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      onChange(15);
    }
  };

  return (
    <div className={`iv-selector iv-selector--${tone}`}>
      <div className="iv-selector__heading" id={labelId}>
        <span>{label}</span>
        <strong>{normalizedValue}</strong>
      </div>
      <div className="iv-selector__segments" role="group" aria-labelledby={labelId}>
        {IV_VALUES.map((segmentValue) => (
          <button
            key={segmentValue}
            type="button"
            className={segmentValue <= normalizedValue ? 'is-filled' : ''}
            aria-label={`${label} ${segmentValue}`}
            aria-pressed={segmentValue === normalizedValue}
            onClick={() => onChange(segmentValue)}
            onKeyDown={handleKeyDown}
          >
            {segmentValue}
          </button>
        ))}
      </div>
    </div>
  );
}

