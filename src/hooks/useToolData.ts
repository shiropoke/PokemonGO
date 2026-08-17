import { useCallback, useEffect, useState } from 'react';
import { fetchGameData } from '../services/gameData';
import { fetchPokemonData } from '../services/pokemonData';
import type { GameData } from '../types/gameData';
import type { Pokemon } from '../types/pokemon';

export interface ToolDataState {
  pokemon: Pokemon[];
  gameData: GameData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useToolData(): ToolDataState {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<Omit<ToolDataState, 'retry'>>({
    pokemon: [],
    gameData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let ignore = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    void Promise.all([
      fetchPokemonData({ force: version > 0 }),
      fetchGameData({ force: version > 0 }),
    ])
      .then(([pokemonResult, gameData]) => {
        if (ignore) return;
        setState({
          pokemon: pokemonResult.pokemon,
          gameData,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (ignore) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: '計算用データを読み込めませんでした',
        }));
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  const retry = useCallback(() => setVersion((current) => current + 1), []);
  return { ...state, retry };
}
