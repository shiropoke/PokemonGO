export const POKEMON_TYPES = [
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];
export type MoveKind = 'fast' | 'charged';

export interface EvolutionTarget {
  speciesId: string;
  candyCost?: number;
}

export interface GamePokemonData {
  speciesId: string;
  types: PokemonType[];
  fastMoveIds: string[];
  chargedMoveIds: string[];
  eliteFastMoveIds: string[];
  eliteChargedMoveIds: string[];
  evolutions: EvolutionTarget[];
}

export interface PveMoveMetrics {
  power?: number;
  durationMs?: number;
  /** 通常技は増加、ゲージ技は負数（消費）です。 */
  energyDelta?: number;
  dps?: number;
  eps?: number;
}

export interface PvpMoveMetrics {
  power?: number;
  /** 通常技は増加、ゲージ技は負数（消費）です。 */
  energyDelta?: number;
  turns?: number;
  dpt?: number;
  ept?: number;
  dpe?: number;
}

export interface GameMoveData {
  id: string;
  /** PokeMiners公式日本語テキスト。欠損時のみ英語ID由来の表示です。 */
  name: string;
  type: PokemonType;
  kind: MoveKind;
  pve?: PveMoveMetrics;
  pvp?: PvpMoveMetrics;
}

export interface PowerUpModifiers {
  luckyStardust: number;
  shadowStardust: number;
  shadowCandy: number;
  purifiedStardust: number;
  purifiedCandy: number;
}

export interface PowerUpCostTable {
  maxLevel: number;
  /** 現在PLの整数部分 - 1 を添字にする、1回（0.5PL）分のコスト。 */
  stardustCostByLevel: number[];
  candyCostByLevel: number[];
  /** PL40以上のとき、現在PLの整数部分 - 40 を添字にします。 */
  xlCandyCostFromLevel40: number[];
}

export interface PowerUpCostData extends PowerUpCostTable {
  upgradesPerLevel: number;
  modifiers: PowerUpModifiers;
  /** Game Masterに明示された種族別テーブルだけを収録します。 */
  overrides: Record<string, PowerUpCostTable>;
}

export type TypeEffectivenessChart = Record<
  PokemonType,
  Record<PokemonType, number>
>;

export interface GameDataSources {
  gameMaster: string;
  japaneseText: string;
  pokemonBaseData: string;
}

export interface GameData {
  version: number;
  generatedAt: string;
  sources: GameDataSources;
  types: PokemonType[];
  typeEffectiveness: TypeEffectivenessChart;
  powerUp: PowerUpCostData;
  moves: Record<string, GameMoveData>;
  pokemon: Record<string, GamePokemonData>;
}
