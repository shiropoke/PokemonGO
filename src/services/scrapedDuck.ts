import type {
  CachedDataResult,
  CombatPowerRange,
  DatasetLoadOptions,
  EggHatch,
  FieldResearchTask,
  RaidBoss,
  ResearchReward,
  RocketLineup,
  RocketPokemon,
  ScrapedDuckDataset,
} from '../types/scrapedDuck';
import { SCRAPED_DUCK_CACHE_KEYS } from './appStorage';
import { loadRocketDialogueEntries } from './rocketDialogues';
import {
  getRocketTitleLabel,
  getRocketTrainerName,
  localizeExternalPokemonName,
  localizeResearchText,
  resolveExternalPokemonSpeciesId,
  stripExternalMarkup,
} from '../utils/scrapedDuckLocalization';
import { joinRocketDialogues } from '../utils/rocketDialogues';

export const SCRAPED_DUCK_DATA_URLS = {
  raids: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json',
  research: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json',
  eggs: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json',
  rocket:
    'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/rocketLineups.json',
} as const satisfies Record<ScrapedDuckDataset, string>;

export const SCRAPED_DUCK_CACHE_TTL_MS = 5 * 60 * 1000;

const CACHE_VERSION = 1;
const inFlightRequests = new Map<ScrapedDuckDataset, Promise<unknown>>();

interface CacheEnvelope {
  version: number;
  fetchedAt: number;
  payload: unknown;
}

interface DatasetDefinition<T> {
  key: ScrapedDuckDataset;
  normalize: (value: unknown) => T | null;
}

export class ScrapedDuckFetchError extends Error {
  constructor(public readonly dataset: ScrapedDuckDataset) {
    super('情報を取得できませんでした');
    this.name = 'ScrapedDuckFetchError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function optionalUrl(value: unknown): string | null {
  const input = optionalString(value);
  if (!input) return null;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' || url.protocol === 'http:' ? input : null;
  } catch {
    return null;
  }
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readCombatPowerRange(value: unknown): CombatPowerRange | null {
  if (!isRecord(value)) return null;
  const min = optionalNumber(value.min);
  const max = optionalNumber(value.max);
  if (min === null || max === null || min < 0 || max < min) return null;
  return { min: Math.trunc(min), max: Math.trunc(max) };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(optionalString).filter((item): item is string => Boolean(item)))]
    .map((item) => item.toLowerCase());
}

function readNamedObjectArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value.flatMap((item) => {
    if (typeof item === 'string') return optionalString(item) ?? [];
    if (!isRecord(item)) return [];
    return optionalString(item.name) ?? [];
  });
  return [...new Set(names.map((name) => name.toLowerCase()))];
}

function safeIdPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'unknown';
}

function normalizeArray<T>(
  value: unknown,
  normalizeItem: (item: unknown, index: number) => T | null,
): T[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map(normalizeItem)
    .filter((item): item is T => item !== null);
  if (value.length > 0 && normalized.length === 0) return null;
  return normalized;
}

function normalizeRaid(item: unknown, index: number): RaidBoss | null {
  if (!isRecord(item)) return null;
  const name = optionalString(item.name);
  const tier = optionalString(item.tier);
  if (!name || !tier) return null;

  const combatPower = isRecord(item.combatPower)
    ? {
        normal: readCombatPowerRange(item.combatPower.normal),
        boosted: readCombatPowerRange(item.combatPower.boosted),
      }
    : null;

  return {
    id: `raid-${safeIdPart(name)}-${index}`,
    name,
    displayName: localizeExternalPokemonName(name),
    speciesId: resolveExternalPokemonSpeciesId(name),
    tier,
    // raids.jsonにshadow/isShadowフィールドはなく、現行スキーマでは
    // `Shadow ` で始まるnameと通常と同じtierの組み合わせで表現される。
    isShadow: /^Shadow\s+/i.test(name),
    canBeShiny: item.canBeShiny === true,
    types: readNamedObjectArray(item.types),
    combatPower,
    boostedWeather: readNamedObjectArray(item.boostedWeather),
    image: optionalUrl(item.image),
  };
}

export function normalizeRaids(value: unknown): RaidBoss[] | null {
  return normalizeArray(value, normalizeRaid);
}

function normalizeResearchReward(
  item: unknown,
  taskIndex: number,
  rewardIndex: number,
): ResearchReward | null {
  if (!isRecord(item)) return null;
  const name = optionalString(item.name);
  if (!name) return null;
  return {
    id: `research-reward-${safeIdPart(name)}-${taskIndex}-${rewardIndex}`,
    name,
    displayName: localizeExternalPokemonName(name),
    image: optionalUrl(item.image),
    canBeShiny: item.canBeShiny === true,
    combatPower: readCombatPowerRange(item.combatPower),
  };
}

function normalizeResearchTask(item: unknown, index: number): FieldResearchTask | null {
  if (!isRecord(item)) return null;
  const rawText = optionalString(item.text);
  if (!rawText) return null;
  const text = stripExternalMarkup(rawText);
  const rewards = Array.isArray(item.rewards)
    ? item.rewards
        .map((reward, rewardIndex) =>
          normalizeResearchReward(reward, index, rewardIndex),
        )
        .filter((reward): reward is ResearchReward => reward !== null)
    : [];

  return {
    id: `research-${safeIdPart(text)}-${index}`,
    text,
    displayText: localizeResearchText(rawText),
    type: optionalString(item.type)?.toLowerCase() ?? null,
    rewards,
  };
}

export function normalizeResearch(value: unknown): FieldResearchTask[] | null {
  return normalizeArray(value, normalizeResearchTask);
}

function normalizeEgg(item: unknown, index: number): EggHatch | null {
  if (!isRecord(item)) return null;
  const name = optionalString(item.name);
  const eggType = optionalString(item.eggType);
  if (!name || !eggType) return null;
  const rarity = optionalNumber(item.rarity);

  return {
    id: `egg-${safeIdPart(eggType)}-${safeIdPart(name)}-${index}`,
    name,
    displayName: localizeExternalPokemonName(name),
    eggType,
    isAdventureSync: item.isAdventureSync === true,
    isRegional: item.isRegional === true,
    isGiftExchange: item.isGiftExchange === true,
    canBeShiny: item.canBeShiny === true,
    rarity: rarity !== null && rarity >= 0 ? Math.trunc(rarity) : null,
    image: optionalUrl(item.image),
    combatPower: readCombatPowerRange(item.combatPower),
  };
}

export function normalizeEggs(value: unknown): EggHatch[] | null {
  return normalizeArray(value, normalizeEgg);
}

function normalizeRocketPokemon(
  item: unknown,
  lineupIndex: number,
  slot: number,
  pokemonIndex: number,
): RocketPokemon | null {
  if (!isRecord(item)) return null;
  const name = optionalString(item.name);
  if (!name) return null;
  return {
    id: `rocket-${lineupIndex}-${slot}-${safeIdPart(name)}-${pokemonIndex}`,
    name,
    displayName: localizeExternalPokemonName(name),
    image: optionalUrl(item.image),
    types: readStringArray(item.types),
    isEncounter: item.isEncounter === true,
    canBeShiny: item.canBeShiny === true,
  };
}

function readRocketSlot(
  value: unknown,
  lineupIndex: number,
  slot: number,
): RocketPokemon[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((pokemon, pokemonIndex) =>
      normalizeRocketPokemon(pokemon, lineupIndex, slot, pokemonIndex),
    )
    .filter((pokemon): pokemon is RocketPokemon => pokemon !== null);
}

function normalizeRocketLineup(item: unknown, index: number): RocketLineup | null {
  if (!isRecord(item)) return null;
  const name = optionalString(item.name);
  const title = optionalString(item.title);
  if (!name || !title) return null;
  const type = optionalString(item.type)?.toLowerCase() ?? null;

  return {
    id: `rocket-lineup-${safeIdPart(name)}-${index}`,
    name,
    displayName: getRocketTrainerName(name, type),
    title,
    titleLabel: getRocketTitleLabel(title),
    type,
    dialogues: [],
    firstPokemon: readRocketSlot(item.firstPokemon, index, 1),
    secondPokemon: readRocketSlot(item.secondPokemon, index, 2),
    thirdPokemon: readRocketSlot(item.thirdPokemon, index, 3),
  };
}

export function normalizeRocketLineups(value: unknown): RocketLineup[] | null {
  return normalizeArray(value, normalizeRocketLineup);
}

const DATASETS = {
  raids: { key: 'raids', normalize: normalizeRaids },
  research: { key: 'research', normalize: normalizeResearch },
  eggs: { key: 'eggs', normalize: normalizeEggs },
  rocket: { key: 'rocket', normalize: normalizeRocketLineups },
} as const;

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function getCacheKey(dataset: ScrapedDuckDataset): string {
  return SCRAPED_DUCK_CACHE_KEYS[dataset];
}

function readCache<T>(definition: DatasetDefinition<T>): {
  fetchedAt: number;
  data: T;
} | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const serialized = storage.getItem(getCacheKey(definition.key));
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION) return null;
    if (typeof parsed.fetchedAt !== 'number' || !Number.isFinite(parsed.fetchedAt)) {
      return null;
    }
    const data = definition.normalize(parsed.payload);
    return data === null ? null : { fetchedAt: parsed.fetchedAt, data };
  } catch {
    return null;
  }
}

function writeCache(dataset: ScrapedDuckDataset, payload: unknown, fetchedAt: number): void {
  const storage = getStorage();
  if (!storage) return;
  const record: CacheEnvelope = { version: CACHE_VERSION, fetchedAt, payload };
  try {
    storage.setItem(getCacheKey(dataset), JSON.stringify(record));
  } catch {
    // Safariプライベートブラウズや容量制限時も取得結果自体はその場で利用する。
  }
}

function isFresh(fetchedAt: number): boolean {
  const age = Date.now() - fetchedAt;
  return age >= 0 && age < SCRAPED_DUCK_CACHE_TTL_MS;
}

async function requestDataset<T>(definition: DatasetDefinition<T>): Promise<{
  data: T;
  fetchedAt: number;
}> {
  const response = await fetch(SCRAPED_DUCK_DATA_URLS[definition.key], {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new ScrapedDuckFetchError(definition.key);
  const payload: unknown = await response.json();
  const data = definition.normalize(payload);
  if (data === null) throw new ScrapedDuckFetchError(definition.key);
  const fetchedAt = Date.now();
  writeCache(definition.key, payload, fetchedAt);
  return { data, fetchedAt };
}

function getNetworkRequest<T>(definition: DatasetDefinition<T>): Promise<{
  data: T;
  fetchedAt: number;
}> {
  const existing = inFlightRequests.get(definition.key) as
    | Promise<{ data: T; fetchedAt: number }>
    | undefined;
  if (existing) return existing;

  const request = requestDataset(definition).finally(() => {
    inFlightRequests.delete(definition.key);
  });
  inFlightRequests.set(definition.key, request);
  return request;
}

async function loadDataset<T>(
  definition: DatasetDefinition<T>,
  options: DatasetLoadOptions = {},
): Promise<CachedDataResult<T>> {
  const cached = readCache(definition);
  if (cached && isFresh(cached.fetchedAt)) {
    return { ...cached, source: 'cache', stale: false };
  }

  try {
    const result = await getNetworkRequest(definition);
    if (options.signal?.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
    return { ...result, source: 'network', stale: false };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (cached) return { ...cached, source: 'cache', stale: true };
    throw error instanceof ScrapedDuckFetchError
      ? error
      : new ScrapedDuckFetchError(definition.key);
  }
}

export const loadRaids = (options?: DatasetLoadOptions) =>
  loadDataset(DATASETS.raids, options);
export const loadResearch = (options?: DatasetLoadOptions) =>
  loadDataset(DATASETS.research, options);
export const loadEggs = (options?: DatasetLoadOptions) =>
  loadDataset(DATASETS.eggs, options);
export const loadRocketLineups = async (options: DatasetLoadOptions = {}) => {
  const result = await loadDataset(DATASETS.rocket, options);
  try {
    const dialogues = await loadRocketDialogueEntries(options);
    return { ...result, data: joinRocketDialogues(result.data, dialogues) };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return result;
  }
};
