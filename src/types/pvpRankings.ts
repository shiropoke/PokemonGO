import type { League } from './calculations';

export interface PvpSpeciesStats {
  product: number | null;
  atk: number | null;
  def: number | null;
  hp: number | null;
}

export interface PvpSpeciesRanking {
  speciesId: string;
  speciesName: string;
  score: number;
  moveset: string[];
  stats?: PvpSpeciesStats;
}

export interface PvpLeagueRankings {
  cp: number;
  sourceUrl: string;
  rankings: PvpSpeciesRanking[];
}

export interface PvpRankingsData {
  schemaVersion: 1;
  generatedAt: string;
  source: string;
  license: 'MIT';
  leagues: Record<League, PvpLeagueRankings>;
}
