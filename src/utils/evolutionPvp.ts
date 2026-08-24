import type { IndividualValues, League, PvpRankResult } from '../types/calculations';
import type { EvolutionDescendant } from './evolutionChain';
import { getPvpRankResult } from './pvp';

const LEAGUES = ['great', 'ultra', 'master'] as const satisfies readonly League[];

export interface EvolutionPvpResult extends EvolutionDescendant {
  pvpResults: Record<League, PvpRankResult | null>;
  calculationError: boolean;
}

export function calculateEvolutionPvpResults(
  descendants: readonly EvolutionDescendant[],
  ivs: IndividualValues,
  effectiveLevelCap: number,
): EvolutionPvpResult[] {
  return descendants.map((descendant) => {
    const pvpResults: Record<League, PvpRankResult | null> = {
      great: null,
      ultra: null,
      master: null,
    };
    let calculationError = false;

    for (const league of LEAGUES) {
      try {
        pvpResults[league] = getPvpRankResult(
          descendant.pokemon.baseStats,
          ivs,
          league,
          effectiveLevelCap,
        );
      } catch {
        calculationError = true;
      }
    }

    return { ...descendant, pvpResults, calculationError };
  });
}
