import type { IndividualValues } from '../types/calculations';
import type { PokemonBaseStats } from '../types/pokemon';
import { calculateCp } from './cp';

export interface EvolutionCpResult {
  level: number;
  sourceCp: number;
  evolvedCp: number;
}

/** 進化で変化しないPL・IVを、そのまま既存の正確なCP式へ渡します。 */
export function calculateEvolutionCp(
  sourceStats: PokemonBaseStats,
  evolvedStats: PokemonBaseStats,
  ivs: IndividualValues,
  level: number,
): EvolutionCpResult {
  return {
    level,
    sourceCp: calculateCp(sourceStats, ivs, level),
    evolvedCp: calculateCp(evolvedStats, ivs, level),
  };
}
