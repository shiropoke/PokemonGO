export interface CombatPowerRange {
  min: number;
  max: number;
}

export interface RaidPokemonDetails {
  form: string;
  stats?: {
    attack: number;
    defense: number;
    stamina: number;
  };
  maxCp?: number;
  size?: {
    heightM?: number;
    weightKg?: number;
  };
  buddyDistanceKm?: number;
  secondMoveCost?: { stardust?: number; candy?: number };
  purificationCost?: { stardust?: number; candy?: number };
  moves?: {
    fast: string[];
    charged: string[];
    eliteFast: string[];
    eliteCharged: string[];
  };
  evolutions?: string[];
}

/**
 * 画面で利用するレイド情報。取得元に依存せず、現在出現しているかどうかと
 * ポケモンの静的な詳細を分けて保持する。
 */
export interface RaidBoss {
  /** 検索・URL参照でも使える、順序に依存しないID。 */
  id: string;
  /** 英語のsource名。 */
  name: string;
  displayName: string;
  pokedexId?: number | null;
  unifiedPokemonKey?: string | null;
  /** 既存Game Master辞書と照合できた場合だけ設定する内部ID。 */
  speciesId: string | null;
  /** 表示・既存filter用に正規化したtier。 */
  tier: string;
  /** PoGoAPIの外側tier keyなど、取得元そのままのtier。 */
  sourceTier?: string;
  isShadow: boolean;
  isMega?: boolean;
  canBeShiny: boolean;
  types: string[];
  combatPower: {
    normal: CombatPowerRange | null;
    boosted: CombatPowerRange | null;
  } | null;
  boostedWeather: string[];
  image: string | null;
  stats?: {
    attack: number;
    defense: number;
    stamina: number;
  } | null;
  /** Unified Pokémon Data と安全に照合できた場合だけ付与するポケモン固有情報。 */
  pokemonDetails?: RaidPokemonDetails;
  /** フィールド単位での補完元を追跡するための表示用metadata。 */
  sources?: {
    membership: 'scrapedduck';
    details?: 'unified' | 'scrapedduck';
    image?: 'scrapedduck';
  };
}

export type RaidDataProvider = 'scrapedduck';
