export interface PokemonBaseStats {
  atk: number;
  def: number;
  hp: number;
}

/** PvPoke の Game Master から計算に必要な項目だけを抜き出したデータです。 */
export interface Pokemon {
  dex: number;
  /** PvPoke由来の英語内部ID。計算・検索・データ照合用です。 */
  speciesId: string;
  /** PvPoke由来の英語名。検索と日本語名欠損時のフォールバック用です。 */
  speciesName: string;
  /** 生成済みデータに含まれる日本語名。欠損時は静的辞書を参照します。 */
  displayNameJa?: string;
  /** 日本語を優先して解決した画面表示名。 */
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
