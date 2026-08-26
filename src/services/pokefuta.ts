import type { Pokefuta, PokefutaDataset, PokefutaPrefecture, PokefutaRegion } from '../types/pokefuta';
import type { CachedDataResult, DatasetLoadOptions } from '../types/scrapedDuck';

const POKEFUTA_DATA_URL = `${import.meta.env.BASE_URL}data/pokefuta.json`;
const POKEFUTA_SOURCE_URL = 'https://local.pokemon.jp/manhole/';
const OFFICIAL_HOST = 'local.pokemon.jp';
const REGIONS = new Set<PokefutaRegion>([
  '北海道・東北', '関東', '中部', '近畿', '中国・四国', '九州・沖縄',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isOfficialUrl(value: unknown): value is string {
  if (!isHttpUrl(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:'
    && url.hostname === OFFICIAL_HOST
    && /^\/manhole\/desc\/\d+\/$/.test(url.pathname);
}

function readRegion(value: unknown): PokefutaRegion | null {
  return typeof value === 'string' && REGIONS.has(value as PokefutaRegion)
    ? value as PokefutaRegion
    : null;
}

function normalizePrefecture(value: unknown): PokefutaPrefecture | null {
  if (!isRecord(value)) return null;
  const region = readRegion(value.region);
  if (
    !Number.isInteger(value.code)
    || typeof value.name !== 'string'
    || typeof value.slug !== 'string'
    || !region
    || !Number.isInteger(value.order)
    || !Number.isInteger(value.count)
    || typeof value.installed !== 'boolean'
  ) return null;
  return {
    code: value.code as number,
    name: value.name,
    slug: value.slug,
    region,
    order: value.order as number,
    count: value.count as number,
    installed: value.installed,
  };
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeLid(value: unknown): Pokefuta | null {
  if (!isRecord(value)) return null;
  const region = readRegion(value.region);
  const pokemonNames = Array.isArray(value.pokemonNames)
    ? value.pokemonNames.filter((name): name is string => typeof name === 'string' && name.length > 0)
    : [];
  if (
    typeof value.id !== 'string'
    || typeof value.prefecture !== 'string'
    || !Number.isInteger(value.prefectureCode)
    || typeof value.prefectureSlug !== 'string'
    || !region
    || typeof value.municipality !== 'string'
    || typeof value.locationName !== 'string'
    || pokemonNames.length === 0
    || typeof value.address !== 'string'
    || !isOfficialUrl(value.officialUrl)
  ) return null;
  const mapUrl = value.mapUrl === null ? null : isHttpUrl(value.mapUrl) ? value.mapUrl : null;
  const imageUrl = value.imageUrl === null ? null : isHttpUrl(value.imageUrl) ? value.imageUrl : null;
  return {
    id: value.id,
    prefecture: value.prefecture,
    prefectureCode: value.prefectureCode as number,
    prefectureSlug: value.prefectureSlug,
    region,
    municipality: value.municipality,
    locationName: value.locationName,
    pokemonNames,
    address: value.address,
    imageUrl,
    officialUrl: value.officialUrl,
    mapUrl,
    latitude: nullableNumber(value.latitude),
    longitude: nullableNumber(value.longitude),
  };
}

export function normalizePokefutaDataset(value: unknown): PokefutaDataset | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.summary)) return null;
  const prefectures = Array.isArray(value.prefectures)
    ? value.prefectures.map(normalizePrefecture).filter((entry): entry is PokefutaPrefecture => entry !== null)
    : [];
  const lids = Array.isArray(value.lids)
    ? value.lids.map(normalizeLid).filter((entry): entry is Pokefuta => entry !== null)
    : [];
  const installedPrefectures = prefectures.filter(({ count }) => count > 0).length;
  const countBySlug = new Map<string, number>();
  for (const lid of lids) {
    countBySlug.set(lid.prefectureSlug, (countBySlug.get(lid.prefectureSlug) ?? 0) + 1);
  }
  if (
    prefectures.length !== 47
    || !Number.isInteger(value.summary.total)
    || !Number.isInteger(value.summary.installedPrefectures)
    || !Number.isInteger(value.summary.uninstalledPrefectures)
    || value.summary.total !== lids.length
    || prefectures.reduce((sum, prefecture) => sum + prefecture.count, 0) !== lids.length
    || prefectures.some((prefecture) =>
      prefecture.count !== (countBySlug.get(prefecture.slug) ?? 0)
      || prefecture.installed !== (prefecture.count > 0))
    || value.summary.installedPrefectures !== installedPrefectures
    || value.summary.uninstalledPrefectures !== 47 - installedPrefectures
    || new Set(lids.map(({ id }) => id)).size !== lids.length
    || typeof value.generatedAt !== 'string'
    || Number.isNaN(Date.parse(value.generatedAt))
    || value.source !== POKEFUTA_SOURCE_URL
  ) return null;
  return {
    schemaVersion: 1,
    generatedAt: value.generatedAt,
    source: value.source,
    summary: {
      total: value.summary.total as number,
      installedPrefectures: value.summary.installedPrefectures as number,
      uninstalledPrefectures: value.summary.uninstalledPrefectures as number,
    },
    prefectures,
    lids,
  };
}

export async function loadPokefuta(
  options: DatasetLoadOptions = {},
): Promise<CachedDataResult<PokefutaDataset>> {
  const response = await fetch(POKEFUTA_DATA_URL, {
    cache: options.forceRefresh ? 'no-store' : 'default',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Poké Lid data request failed.');
  const data = normalizePokefutaDataset(await response.json());
  if (!data) throw new Error('Invalid Poké Lid data.');
  return {
    data,
    fetchedAt: Date.parse(data.generatedAt),
    source: 'network',
    stale: false,
  };
}
