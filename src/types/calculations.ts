export interface BaseStats {
  atk: number;
  def: number;
  hp: number;
}

export interface IndividualValues {
  attack: number;
  defense: number;
  hp: number;
}

export type StandardMaxLevel = 40 | 50;

export type League = 'great' | 'ultra' | 'master';
export type CappedLeague = Exclude<League, 'master'>;

export interface BattleStats {
  level: number;
  cp: number;
  attack: number;
  defense: number;
  hp: number;
  /** Attack x Defense x HP. */
  statProduct: number;
}

export interface PvpRankResult extends BattleStats {
  ivs: IndividualValues;
  rank: number;
  total: 4096;
  topPercent: number;
}

export interface MasterLeagueResult extends BattleStats {
  ivTotal: number;
  ivPercentage: number;
  isPerfect: boolean;
}

export type IvStarRating = 0 | 1 | 2 | 3 | 4;

export interface IvSummary {
  total: number;
  percentage: number;
  stars: IvStarRating;
  gradeLabel: '0★' | '1★' | '2★' | '3★' | '4★ / PERFECT';
}

// Short aliases are useful at call sites that already use Pokemon GO terminology.
export type IVs = IndividualValues;
export type PokemonBaseStats = BaseStats;
