import type {
  BaseStats,
  CappedLeague,
  IndividualValues,
  League,
  MasterLeagueResult,
  PvpRankResult,
} from '../types/calculations';
import {
  calculateBattleStats,
  findHighestLevelAtOrBelowCp,
  getCpMultiplier,
  isValidBaseStats,
} from './cp';
import { calculateIvSummary, isValidIndividualValues } from './iv';

export const PVP_COMBINATION_COUNT = 4096 as const;

export const LEAGUE_CP_CAPS = {
  great: 1500,
  ultra: 2500,
  master: null,
} as const satisfies Record<League, number | null>;

interface CachedRanking {
  entries: PvpRankResult[];
  byIv: Map<string, PvpRankResult>;
}

const rankingCache = new Map<string, CachedRanking>();
const MAX_RANKING_CACHE_ENTRIES = 12;

function ivKey(ivs: IndividualValues): string {
  return `${ivs.attack}/${ivs.defense}/${ivs.hp}`;
}

function rankingCacheKey(
  baseStats: BaseStats,
  league: CappedLeague,
  maxLevel: number,
): string {
  return `${baseStats.atk}/${baseStats.def}/${baseStats.hp}|${league}|${maxLevel}`;
}

export function getLeagueCpCap(league: League): number | null {
  return LEAGUE_CP_CAPS[league];
}

function compareRankCandidates(
  left: Omit<PvpRankResult, 'rank' | 'total' | 'topPercent'>,
  right: Omit<PvpRankResult, 'rank' | 'total' | 'topPercent'>,
): number {
  // Stat product is the ranking criterion. The remaining comparisons only
  // provide stable, useful ordering for the extremely rare exact tie.
  return (
    right.statProduct - left.statProduct ||
    right.attack - left.attack ||
    right.hp - left.hp ||
    right.cp - left.cp ||
    right.ivs.hp - left.ivs.hp ||
    right.ivs.defense - left.ivs.defense ||
    right.ivs.attack - left.ivs.attack
  );
}

function buildPvpRanking(
  baseStats: BaseStats,
  league: CappedLeague,
  maxLevel: number,
): CachedRanking {
  // Validate maxLevel once before entering the hot loop.
  getCpMultiplier(maxLevel);
  const cpCap = LEAGUE_CP_CAPS[league];
  const candidates: Array<
    Omit<PvpRankResult, 'rank' | 'total' | 'topPercent'>
  > = [];

  for (let attack = 0; attack <= 15; attack += 1) {
    for (let defense = 0; defense <= 15; defense += 1) {
      for (let hp = 0; hp <= 15; hp += 1) {
        const ivs: IndividualValues = { attack, defense, hp };
        const battleStats = findHighestLevelAtOrBelowCp(
          baseStats,
          ivs,
          cpCap,
          maxLevel,
        );

        // With valid positive base stats, every IV combination has at least
        // the minimum CP 10 at PL1, so this branch is only defensive.
        if (battleStats === null) continue;
        candidates.push({ ...battleStats, ivs });
      }
    }
  }

  candidates.sort(compareRankCandidates);

  const entries: PvpRankResult[] = candidates.map((candidate, index) => {
    const rank = index + 1;
    return {
      ...candidate,
      rank,
      total: PVP_COMBINATION_COUNT,
      topPercent: (rank / PVP_COMBINATION_COUNT) * 100,
    };
  });
  const byIv = new Map(entries.map((entry) => [ivKey(entry.ivs), entry]));

  return { entries, byIv };
}

function getCachedRanking(
  baseStats: BaseStats,
  league: CappedLeague,
  maxLevel: number,
): CachedRanking {
  if (!isValidBaseStats(baseStats)) {
    throw new RangeError('Base stats must contain positive finite atk, def and hp values.');
  }
  const cacheKey = rankingCacheKey(baseStats, league, maxLevel);
  const cached = rankingCache.get(cacheKey);
  if (cached !== undefined) {
    // Touch the entry so the cache stays bounded around recently used choices.
    rankingCache.delete(cacheKey);
    rankingCache.set(cacheKey, cached);
    return cached;
  }

  const ranking = buildPvpRanking(baseStats, league, maxLevel);
  rankingCache.set(cacheKey, ranking);
  if (rankingCache.size > MAX_RANKING_CACHE_ENTRIES) {
    const oldestKey = rankingCache.keys().next().value;
    if (typeof oldestKey === 'string') rankingCache.delete(oldestKey);
  }
  return ranking;
}

export function getPvpRankings(
  baseStats: BaseStats,
  league: CappedLeague,
  maxLevel: number,
): PvpRankResult[] {
  return getCachedRanking(baseStats, league, maxLevel).entries;
}

export function getPvpRankResult(
  baseStats: BaseStats,
  ivs: IndividualValues,
  league: CappedLeague,
  maxLevel: number,
): PvpRankResult | null {
  if (!isValidIndividualValues(ivs)) return null;
  return getCachedRanking(baseStats, league, maxLevel).byIv.get(ivKey(ivs)) ?? null;
}

export function calculateMasterLeagueStats(
  baseStats: BaseStats,
  ivs: IndividualValues,
  maxLevel: number,
): MasterLeagueResult {
  const battleStats = calculateBattleStats(baseStats, ivs, maxLevel);
  const ivSummary = calculateIvSummary(ivs);

  return {
    ...battleStats,
    ivTotal: ivSummary.total,
    ivPercentage: ivSummary.percentage,
    isPerfect: ivSummary.total === 45,
  };
}

/** Primarily useful when data changes during development or in tests. */
export function clearPvpRankingCache(): void {
  rankingCache.clear();
}
