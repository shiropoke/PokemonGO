import type {
  Pokemon,
  PokemonBaseStats,
  PokemonDataResult,
  PokemonDataSource,
} from '../types/pokemon';
import { getPokemonDisplayName } from '../utils/pokemonLocalization';
import { POKEMON_DATA_CACHE_KEY } from './appStorage';

export const PVPokeGameMasterUrl =
  'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
export const POKEMON_DATA_URL = `${import.meta.env.BASE_URL}data/pokemon.json`;

const CACHE_VERSION = 2;
export const POKEMON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredPokemonCache {
  version: number;
  fetchedAt: number;
  data: Pokemon[];
}

interface FetchPokemonDataOptions {
  force?: boolean;
  signal?: AbortSignal;
}

let memoryResult: PokemonDataResult | null = null;
let inFlight: Promise<PokemonDataResult> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPositiveStat(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.trunc(value);
}

function readBaseStats(value: unknown): PokemonBaseStats | null {
  if (!isRecord(value)) return null;

  const atk = readPositiveStat(value.atk);
  const def = readPositiveStat(value.def);
  const hp = readPositiveStat(value.hp);
  if (atk === null || def === null || hp === null) return null;

  return { atk, def, hp };
}

function getFormName(speciesName: string): string | undefined {
  const forms = [...speciesName.matchAll(/[（(]([^()（）]+)[）)]/g)]
    .map((match) => match[1]?.trim())
    .filter(
      (name): name is string =>
        typeof name === 'string' &&
        name.length > 0 &&
        !/^(?:shadow|シャドウ)$/i.test(name),
    );
  return forms.join('・') || undefined;
}

function normalizePokemon(value: unknown): Pokemon | null {
  if (!isRecord(value)) return null;

  const speciesId = typeof value.speciesId === 'string' ? value.speciesId.trim() : '';
  if (!speciesId) return null;

  const baseStats = readBaseStats(value.baseStats);
  if (!baseStats) return null;

  const rawName = typeof value.speciesName === 'string' ? value.speciesName.trim() : '';
  const speciesName = rawName || speciesId.replaceAll('_', ' ');
  const displayNameJa =
    typeof value.displayNameJa === 'string' ? value.displayNameJa.trim() : '';
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const isShadow =
    tags.includes('shadow') ||
    speciesId.endsWith('_shadow') ||
    /\(shadow\)\s*$/i.test(speciesName);
  const dex =
    typeof value.dex === 'number' && Number.isFinite(value.dex) && value.dex >= 0
      ? Math.trunc(value.dex)
      : 0;
  const displayName = getPokemonDisplayName({
    speciesId,
    speciesName,
    dex,
    embeddedJapaneseName: displayNameJa,
  });

  return {
    dex,
    speciesId,
    speciesName,
    ...(displayNameJa ? { displayNameJa } : {}),
    displayName,
    baseStats,
    released: value.released !== false,
    tags,
    form: getFormName(displayName) ?? getFormName(speciesName),
    isShadow,
  };
}

function extractPokemon(value: unknown): Pokemon[] {
  if (!isRecord(value) || !Array.isArray(value.pokemon)) return [];

  const unique = new Map<string, Pokemon>();
  for (const item of value.pokemon) {
    const pokemon = normalizePokemon(item);
    if (pokemon?.released && !unique.has(pokemon.speciesId)) {
      unique.set(pokemon.speciesId, pokemon);
    }
  }

  return [...unique.values()].sort(
    (a, b) =>
      a.dex - b.dex || a.displayName.localeCompare(b.displayName, 'ja-JP'),
  );
}

function restoreCachedPokemon(value: unknown): Pokemon[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, Pokemon>();
  for (const item of value) {
    const pokemon = normalizePokemon(item);
    if (pokemon?.released && !unique.has(pokemon.speciesId)) {
      unique.set(pokemon.speciesId, pokemon);
    }
  }

  return [...unique.values()].sort(
    (a, b) =>
      a.dex - b.dex || a.displayName.localeCompare(b.displayName, 'ja-JP'),
  );
}

function readCache(): StoredPokemonCache | null {
  try {
    const raw = window.localStorage.getItem(POKEMON_DATA_CACHE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION) return null;
    if (typeof parsed.fetchedAt !== 'number' || !Number.isFinite(parsed.fetchedAt)) return null;

    const data = restoreCachedPokemon(parsed.data);
    if (data.length === 0) return null;

    return {
      version: CACHE_VERSION,
      fetchedAt: parsed.fetchedAt,
      data,
    };
  } catch {
    return null;
  }
}

function writeCache(data: Pokemon[], fetchedAt: number): void {
  try {
    const cache: StoredPokemonCache = {
      version: CACHE_VERSION,
      fetchedAt,
      data,
    };
    window.localStorage.setItem(POKEMON_DATA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Safari のプライベートブラウズや容量制限時も、取得したデータはメモリ上で利用する。
  }
}

function resultFromCache(
  cache: StoredPokemonCache,
  source: Extract<PokemonDataSource, 'cache' | 'stale-cache'>,
): PokemonDataResult {
  return {
    pokemon: cache.data,
    fetchedAt: cache.fetchedAt,
    source,
  };
}

async function requestPokemonData(
  options: FetchPokemonDataOptions,
  cached: StoredPokemonCache | null,
): Promise<PokemonDataResult> {
  try {
    const response = await fetch(POKEMON_DATA_URL, {
      cache: 'no-cache',
      signal: options.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Pokémon data request failed: ${response.status}`);
    }

    const payload: unknown = await response.json();
    const pokemon = extractPokemon(payload);
    if (pokemon.length === 0) {
      throw new Error('PvPoke Game Master did not contain usable Pokémon data.');
    }

    const fetchedAt = Date.now();
    writeCache(pokemon, fetchedAt);
    return { pokemon, fetchedAt, source: 'network' };
  } catch (error) {
    if (cached) return resultFromCache(cached, 'stale-cache');
    throw error;
  }
}

/**
 * PvPoke Game Master を取得し、計算に必要な軽量データだけを長期キャッシュします。
 * 期限切れ後の再取得が失敗した場合は、古いキャッシュを安全に返します。
 */
export function fetchPokemonData(
  options: FetchPokemonDataOptions = {},
): Promise<PokemonDataResult> {
  if (!options.force && memoryResult) return Promise.resolve(memoryResult);
  if (!options.force && inFlight) return inFlight;

  const cached = readCache();
  const cacheIsFresh =
    cached !== null && Date.now() - cached.fetchedAt < POKEMON_CACHE_TTL_MS;

  if (!options.force && cacheIsFresh) {
    memoryResult = resultFromCache(cached, 'cache');
    return Promise.resolve(memoryResult);
  }

  const request = requestPokemonData(options, cached).then((result) => {
    memoryResult = result;
    return result;
  });

  if (!options.force) {
    inFlight = request.finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return request;
}
