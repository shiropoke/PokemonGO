export interface PokemonBaseStats {
  atk: number;
  def: number;
  hp: number;
}

/** PvPoke の Game Master から計算に必要な項目だけを抜き出したデータです。 */
export interface Pokemon {
  dex: number;
  speciesId: string;
  speciesName: string;
  displayName: string;
  baseStats: PokemonBaseStats;
  released: boolean;
  tags: string[];
  form?: string;
  isShadow: boolean;
}

export type PokemonDataSource = 'network' | 'cache' | 'stale-cache';

export interface PokemonDataResult {
  pokemon: Pokemon[];
  fetchedAt: number;
  source: PokemonDataSource;
}

