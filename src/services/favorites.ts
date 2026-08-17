export const FAVORITES_STORAGE_KEY = 'pokemon-go:favorites';
export const FAVORITES_CHANGED_EVENT = 'pokemon-go:favorites-changed';

export interface FavoritesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function normalizeSpeciesId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(normalized) ? normalized : null;
}

export function parseFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeSpeciesId).filter((id): id is string => id !== null))];
}

export function readFavorites(storage?: FavoritesStorage | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? parseFavorites(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

export function writeFavorites(
  speciesIds: readonly string[],
  storage?: FavoritesStorage | null,
): string[] {
  const normalized = parseFavorites([...speciesIds]);
  if (!storage) return normalized;
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage failures must not block the current in-memory selection.
  }
  return normalized;
}

export function toggleFavorite(
  speciesIds: readonly string[],
  speciesId: string,
): string[] {
  const normalized = normalizeSpeciesId(speciesId);
  const current = parseFavorites([...speciesIds]);
  if (!normalized) return current;
  return current.includes(normalized)
    ? current.filter((id) => id !== normalized)
    : [...current, normalized];
}
