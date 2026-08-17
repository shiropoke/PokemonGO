import type { League } from '../types/calculations';
import type {
  PvpLeagueRankings,
  PvpRankingsData,
  PvpSpeciesRanking,
  PvpSpeciesStats,
} from '../types/pvpRankings';

export const PVP_RANKINGS_DATA_URL = `${import.meta.env.BASE_URL}data/pvp-rankings.json`;

let dataPromise: Promise<PvpRankingsData> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseStats(value: unknown): PvpSpeciesStats | undefined {
  if (!isRecord(value)) return undefined;
  return {
    product: finiteNumber(value.product),
    atk: finiteNumber(value.atk),
    def: finiteNumber(value.def),
    hp: finiteNumber(value.hp),
  };
}

function parseRanking(value: unknown): PvpSpeciesRanking | null {
  if (!isRecord(value)) return null;
  const speciesId =
    typeof value.speciesId === 'string' ? value.speciesId.trim() : '';
  const speciesName =
    typeof value.speciesName === 'string' ? value.speciesName.trim() : '';
  const score = finiteNumber(value.score);
  if (!speciesId || !speciesName || score === null) return null;

  const moveset = Array.isArray(value.moveset)
    ? value.moveset.filter(
        (move): move is string =>
          typeof move === 'string' && move.trim().length > 0,
      )
    : [];

  return {
    speciesId,
    speciesName,
    score,
    moveset,
    stats: parseStats(value.stats),
  };
}

function parseLeague(value: unknown): PvpLeagueRankings | null {
  if (!isRecord(value)) return null;
  const cp = finiteNumber(value.cp);
  const sourceUrl =
    typeof value.sourceUrl === 'string' ? value.sourceUrl.trim() : '';
  if (cp === null || !sourceUrl || !Array.isArray(value.rankings)) return null;

  const rankings = value.rankings.map(parseRanking).filter((entry) => entry !== null);
  if (rankings.length === 0) return null;
  return { cp, sourceUrl, rankings };
}

export function parsePvpRankings(value: unknown): PvpRankingsData {
  if (!isRecord(value) || !isRecord(value.leagues)) {
    throw new TypeError('PvPランキングデータの形式が正しくありません');
  }

  const great = parseLeague(value.leagues.great);
  const ultra = parseLeague(value.leagues.ultra);
  const master = parseLeague(value.leagues.master);
  if (!great || !ultra || !master) {
    throw new TypeError('3リーグ分のPvPランキングを読み込めませんでした');
  }

  return {
    schemaVersion: 1,
    generatedAt:
      typeof value.generatedAt === 'string' ? value.generatedAt : '',
    source: typeof value.source === 'string' ? value.source : 'PvPoke',
    license: 'MIT',
    leagues: { great, ultra, master },
  };
}

export function fetchPvpRankings(options: { force?: boolean } = {}): Promise<PvpRankingsData> {
  if (!options.force && dataPromise) return dataPromise;

  const request = fetch(PVP_RANKINGS_DATA_URL, {
    cache: options.force ? 'reload' : 'default',
    headers: { Accept: 'application/json' },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`PvPランキングを取得できませんでした (${response.status})`);
    }
    return parsePvpRankings(await response.json());
  });

  if (!options.force) {
    dataPromise = request.catch((error) => {
      dataPromise = null;
      throw error;
    });
    return dataPromise;
  }
  return request;
}

export function getLeagueRankings(
  data: PvpRankingsData,
  league: League,
): readonly PvpSpeciesRanking[] {
  return data.leagues[league].rankings;
}
