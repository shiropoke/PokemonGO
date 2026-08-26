import { POKEMON_TYPES } from '../types/gameData';
import type {
  UnifiedDataMetadata,
  UnifiedMove,
  UnifiedMoveDataset,
  UnifiedPokemon,
  UnifiedPokemonDataset,
} from '../types/unifiedGameData';

const UNIFIED_BASE_URL = `${import.meta.env.BASE_URL}data/unified`;
export const UNIFIED_DATA_URLS = {
  pokemon: `${UNIFIED_BASE_URL}/pokemon.json`,
  moves: `${UNIFIED_BASE_URL}/moves.json`,
  metadata: `${UNIFIED_BASE_URL}/meta.json`,
} as const;

export interface UnifiedDataLoadOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPokemon(value: unknown): value is UnifiedPokemon {
  if (!isRecord(value) || !isRecord(value.names) || !isRecord(value.form)) return false;
  const moves = isRecord(value.moves) ? value.moves : null;
  if (
    !isNonEmptyString(value.key) || !isPositiveInteger(value.pokedexId)
    || !isNonEmptyString(value.names.ja) || !isNonEmptyString(value.names.en)
    || !isNonEmptyString(value.form.key) || !isNonEmptyString(value.form.nameEn)
    || (value.form.id !== null && !isNonNegativeInteger(value.form.id))
    || !Array.isArray(value.types)
    || value.types.some((type) => !POKEMON_TYPES.includes(type as never))
    || !moves
    || !['fast', 'charged', 'eliteFast', 'eliteCharged'].every(
      (key) => Array.isArray(moves[key])
        && (moves[key] as unknown[]).every(isNonEmptyString),
    )
    || !Array.isArray(value.evolutions)
    || !isRecord(value.flags)
    || !isRecord(value.sourceInfo)
    || !Array.isArray(value.sourceInfo.sources)
  ) return false;
  if (value.stats !== undefined) {
    if (!isRecord(value.stats)) return false;
    const stats = value.stats;
    if (!['attack', 'defense', 'stamina'].every(
      (key) => typeof stats[key] === 'number' && (stats[key] as number) > 0,
    )) return false;
  }
  return true;
}

function isMove(value: unknown): value is UnifiedMove {
  return isRecord(value)
    && isNonEmptyString(value.key)
    && isRecord(value.names)
    && isNonEmptyString(value.names.ja)
    && isNonEmptyString(value.names.en)
    && POKEMON_TYPES.includes(value.type as never)
    && (value.kind === 'fast' || value.kind === 'charged')
    && Array.isArray(value.sources)
    && isRecord(value.fieldSources);
}

export function parseUnifiedPokemonDataset(value: unknown): UnifiedPokemonDataset {
  if (
    !isRecord(value) || value.schemaVersion !== 1
    || !isNonEmptyString(value.generatedAt) || !Array.isArray(value.pokemon)
    || value.pokemon.length === 0 || !value.pokemon.every(isPokemon)
  ) throw new Error('Unified Pokémon data is invalid.');
  const keys = new Set(value.pokemon.map((entry) => entry.key));
  if (keys.size !== value.pokemon.length) throw new Error('Unified Pokémon keys are duplicated.');
  return { schemaVersion: 1, generatedAt: value.generatedAt, pokemon: value.pokemon };
}

export function parseUnifiedMoveDataset(value: unknown): UnifiedMoveDataset {
  if (
    !isRecord(value) || value.schemaVersion !== 1
    || !isNonEmptyString(value.generatedAt) || !Array.isArray(value.moves)
    || value.moves.length === 0 || !value.moves.every(isMove)
  ) throw new Error('Unified move data is invalid.');
  const keys = new Set(value.moves.map((entry) => entry.key));
  if (keys.size !== value.moves.length) throw new Error('Unified move keys are duplicated.');
  return { schemaVersion: 1, generatedAt: value.generatedAt, moves: value.moves };
}

export function parseUnifiedMetadata(value: unknown): UnifiedDataMetadata {
  const counts = isRecord(value) && isRecord(value.counts) ? value.counts : null;
  if (
    !isRecord(value) || value.schemaVersion !== 1
    || !isNonEmptyString(value.generatedAt) || !isRecord(value.sources)
    || !counts || !isRecord(value.coverage)
    || !Array.isArray(value.unmatchedForms) || !Array.isArray(value.conflicts)
    || !['pokemon', 'moves', 'conflicts', 'unmatchedForms', 'unresolvedMoveNames']
      .every((key) => typeof counts[key] === 'number' && (counts[key] as number) >= 0)
  ) throw new Error('Unified metadata is invalid.');
  return value as unknown as UnifiedDataMetadata;
}

function createLoader<T>(url: string, parse: (value: unknown) => T) {
  let memory: T | null = null;
  let inFlight: Promise<T> | null = null;
  return (options: UnifiedDataLoadOptions = {}): Promise<T> => {
    if (!options.forceRefresh && memory) return Promise.resolve(memory);
    if (!options.forceRefresh && inFlight) return inFlight;
    const request = fetch(url, {
      signal: options.signal,
      cache: options.forceRefresh ? 'no-store' : 'default',
      headers: { Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Unified data request failed (${response.status}): ${url}`);
      const parsed = parse(await response.json());
      memory = parsed;
      return parsed;
    });
    if (options.forceRefresh) return request;
    inFlight = request.finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export const fetchUnifiedPokemonData = createLoader(
  UNIFIED_DATA_URLS.pokemon,
  parseUnifiedPokemonDataset,
);
export const fetchUnifiedMoveData = createLoader(
  UNIFIED_DATA_URLS.moves,
  parseUnifiedMoveDataset,
);
export const fetchUnifiedMetadata = createLoader(
  UNIFIED_DATA_URLS.metadata,
  parseUnifiedMetadata,
);

export async function getUnifiedPokemonByKey(
  key: string,
  options?: UnifiedDataLoadOptions,
): Promise<UnifiedPokemon | undefined> {
  const dataset = await fetchUnifiedPokemonData(options);
  return dataset.pokemon.find((entry) => entry.key === key);
}

export async function getUnifiedPokemonByDex(
  pokedexId: number,
  options?: UnifiedDataLoadOptions,
): Promise<UnifiedPokemon[]> {
  const dataset = await fetchUnifiedPokemonData(options);
  return dataset.pokemon.filter((entry) => entry.pokedexId === pokedexId);
}

export async function getUnifiedMoveById(
  moveId: number,
  options?: UnifiedDataLoadOptions,
): Promise<UnifiedMove | undefined> {
  const dataset = await fetchUnifiedMoveData(options);
  return dataset.moves.find((entry) => entry.moveId === moveId);
}
