import { useFavorites } from '../contexts/FavoritesContext';

interface FavoriteButtonProps {
  speciesId: string;
  displayName: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export function FavoriteButton({
  speciesId,
  displayName,
  compact = false,
  iconOnly = false,
}: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(speciesId);

  return (
    <button
      type="button"
      className={`favorite-button${active ? ' is-active' : ''}${compact ? ' is-compact' : ''}${iconOnly ? ' is-icon-only' : ''}`}
      aria-pressed={active}
      aria-label={`${displayName}を${active ? 'お気に入りから削除' : 'お気に入りに追加'}`}
      onClick={() => toggle(speciesId)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}>
        <path d="m12 3 2.72 5.51 6.08.88-4.4 4.29 1.04 6.05L12 16.87l-5.44 2.86 1.04-6.05-4.4-4.29 6.08-.88L12 3Z" />
      </svg>
      {iconOnly ? null : <span>{active ? 'お気に入り済み' : 'お気に入り'}</span>}
    </button>
  );
}
