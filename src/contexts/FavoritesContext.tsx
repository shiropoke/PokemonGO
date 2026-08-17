import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  FAVORITES_STORAGE_KEY,
  readFavorites,
  toggleFavorite,
  writeFavorites,
} from '../services/favorites';

interface FavoritesContextValue {
  favorites: readonly string[];
  isFavorite(speciesId: string): boolean;
  toggle(speciesId: string): void;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  toggle: () => undefined,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() =>
    readFavorites(getStorage()),
  );

  useEffect(() => {
    const syncFromStorage = (event?: StorageEvent) => {
      if (!event || event.key === FAVORITES_STORAGE_KEY) {
        setFavorites(readFavorites(getStorage()));
      }
    };
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const toggle = useCallback((speciesId: string) => {
    setFavorites((current) => {
      const next = writeFavorites(
        toggleFavorite(current, speciesId),
        getStorage(),
      );
      return next;
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(() => {
    const favoriteSet = new Set(favorites);
    return {
      favorites,
      isFavorite: (speciesId) => favoriteSet.has(speciesId),
      toggle,
    };
  }, [favorites, toggle]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext);
}
