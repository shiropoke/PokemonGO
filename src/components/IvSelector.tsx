import { useId } from 'react';

const IV_VALUES = Array.from({ length: 16 }, (_, index) => index);

export type IvSegmentState = 'normal' | 'perfect' | 'inactive';

function normalizeIv(value: number): number {
  return Math.min(15, Math.max(0, Math.trunc(value)));
}

/** IVの種類ではなく、バー全体の現在値だけからセルの役割を決定します。 */
export function getIvSegmentState(
  value: number,
  segmentValue: number,
): IvSegmentState {
  const normalizedValue = normalizeIv(value);
  if (segmentValue > normalizedValue) return 'inactive';
  return normalizedValue === 15 ? 'perfect' : 'normal';
}

interface IvSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function IvSelector({ label, value, onChange }: IvSelectorProps) {
  const labelId = useId();
  const normalizedValue = normalizeIv(value);

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
    <div className="iv-selector">
      <div className="iv-selector__heading" id={labelId}>
        <span>{label}</span>
        <strong>{normalizedValue}</strong>
      </div>
      <div className="iv-selector__segments" role="group" aria-labelledby={labelId}>
        {IV_VALUES.map((segmentValue) => {
          const state = getIvSegmentState(normalizedValue, segmentValue);
          return (
            <button
              key={segmentValue}
              type="button"
              className={`iv-segment iv-segment--${state}`}
              aria-label={`${label} ${segmentValue}`}
              aria-pressed={segmentValue === normalizedValue}
              onClick={() => onChange(segmentValue)}
              onKeyDown={handleKeyDown}
            >
              {segmentValue}
            </button>
          );
        })}
      </div>
    </div>
  );
}
