import type { CSSProperties, ReactNode } from 'react';
import { getTypeMeta } from '../constants/typeMeta';
import type { PokemonType } from '../types/gameData';

export type TypeBadgeVariant = 'default' | 'compact' | 'subtle';

export interface TypeBadgeProps {
  type: PokemonType | string;
  variant?: TypeBadgeVariant;
  className?: string;
  children?: ReactNode;
}

type TypeBadgeStyle = CSSProperties & {
  '--type-color': string;
  '--type-text': string;
  '--type-text-dark': string;
  '--type-rgb': string;
};

export function TypeBadge({
  type,
  variant = 'default',
  className,
  children,
}: TypeBadgeProps) {
  const meta = getTypeMeta(type);
  const classes = [
    'type-badge',
    `type-badge--${variant}`,
    className,
  ].filter(Boolean).join(' ');
  const style: TypeBadgeStyle = {
    '--type-color': meta.representativeColor,
    '--type-text': meta.textColor,
    '--type-text-dark': meta.textColorDark,
    '--type-rgb': meta.rgb,
  };

  return (
    <span className={classes} data-type={meta.key} style={style}>
      {meta.icon ? (
        <img
          className="type-badge__icon"
          src={meta.icon}
          alt=""
          aria-hidden="true"
          width="1254"
          height="1254"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span className="type-badge__label">{meta.labelJa}</span>
      {children ? <span className="type-badge__detail">{children}</span> : null}
    </span>
  );
}
