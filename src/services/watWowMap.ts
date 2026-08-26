import { createExternalJsonClient } from './externalData';
import type { ExternalDataRequestOptions } from '../types/externalData';
import type {
  WatWowMapCostume,
  WatWowMapForm,
  WatWowMapInvasion,
  WatWowMapInvasionEncounter,
  WatWowMapItem,
  WatWowMapMove,
  WatWowMapPokemon,
  WatWowMapPvpBuffs,
  WatWowMapQuestDefinition,
  WatWowMapRaidLevelDefinition,
  WatWowMapTranslationCategory,
  WatWowMapTranslationEntries,
  WatWowMapTranslationLocale,
  WatWowMapType,
  WatWowMapWeather,
} from '../types/watWowMap';

export const WATWOWMAP_DATA_BASE_URL =
  'https://raw.githubusercontent.com/WatWowMap/pogo-data-api/refs/heads/main/data/v1';

export const WATWOWMAP_DATASETS = {
  costumes: `${WATWOWMAP_DATA_BASE_URL}/costumes.json`,
  forms: `${WATWOWMAP_DATA_BASE_URL}/forms.json`,
  invasions: `${WATWOWMAP_DATA_BASE_URL}/invasions.json`,
  items: `${WATWOWMAP_DATA_BASE_URL}/items.json`,
  moves: `${WATWOWMAP_DATA_BASE_URL}/moves.json`,
  pokemon: `${WATWOWMAP_DATA_BASE_URL}/pokemon.json`,
  questConditions: `${WATWOWMAP_DATA_BASE_URL}/quest-conditions.json`,
  questRewardTypes: `${WATWOWMAP_DATA_BASE_URL}/quest-reward-types.json`,
  questTypes: `${WATWOWMAP_DATA_BASE_URL}/quest-types.json`,
  /** 現在のボス一覧ではなく、レイドレベル定義のcollection。 */
  raidLevelDefinitions: `${WATWOWMAP_DATA_BASE_URL}/raids.json`,
  types: `${WATWOWMAP_DATA_BASE_URL}/types.json`,
  weather: `${WATWOWMAP_DATA_BASE_URL}/weather.json`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : null;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function integerArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const result = value.flatMap((entry) => integer(entry) ?? []);
  return result.length === value.length ? result : null;
}

function normalizedArray<T>(
  value: unknown,
  normalize: (entry: unknown) => T | null,
): T[] {
  if (!Array.isArray(value)) throw new Error('Expected an array.');
  const result = value.flatMap((entry) => normalize(entry) ?? []);
  if (value.length > 0 && result.length === 0) {
    throw new Error('The array contained no usable records.');
  }
  return result;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeSizeSetting(value: unknown) {
  if (!isRecord(value)) return null;
  const name = text(value.name);
  const settingValue = finiteNumber(value.value);
  return !name || settingValue === undefined ? null : { name, value: settingValue };
}

function normalizeCostumeOverrideEvolution(value: unknown) {
  if (!isRecord(value)) return null;
  const costumeId = integer(value.costumeId);
  const costumeProto = text(value.costumeProto);
  const costumeName = text(value.costumeName);
  return costumeId === null || !costumeProto || !costumeName
    ? null
    : { costumeId, costumeProto, costumeName };
}

function normalizeTemporaryEvolution(value: unknown) {
  if (!isRecord(value)) return null;
  const tempEvoId = integer(value.tempEvoId);
  const attack = integer(value.attack);
  const defense = integer(value.defense);
  const stamina = integer(value.stamina);
  if (tempEvoId === null || attack === null || defense === null || stamina === null) {
    return null;
  }
  const types = integerArray(value.types);
  return {
    tempEvoId,
    attack,
    defense,
    stamina,
    ...(finiteNumber(value.height) !== undefined ? { height: finiteNumber(value.height) } : {}),
    ...(finiteNumber(value.weight) !== undefined ? { weight: finiteNumber(value.weight) } : {}),
    ...(types ? { types } : {}),
    ...(integer(value.firstEnergyCost) !== null
      ? { firstEnergyCost: integer(value.firstEnergyCost) as number }
      : {}),
    ...(integer(value.subsequentEnergyCost) !== null
      ? { subsequentEnergyCost: integer(value.subsequentEnergyCost) as number }
      : {}),
  };
}

function normalizeEvolution(value: unknown) {
  if (!isRecord(value)) return null;
  const evoId = integer(value.evoId);
  const formId = integer(value.formId);
  if (evoId === null || formId === null) return null;
  return {
    evoId,
    formId,
    ...(integer(value.candyCost) !== null
      ? { candyCost: integer(value.candyCost) as number }
      : {}),
    ...(integer(value.itemId) !== null
      ? { itemId: integer(value.itemId) as number }
      : {}),
    ...(integer(value.lureItemId) !== null
      ? { lureItemId: integer(value.lureItemId) as number }
      : {}),
    ...(finiteNumber(value.distance) !== undefined
      ? { distance: finiteNumber(value.distance) }
      : {}),
  };
}

function normalizePokemon(value: unknown): WatWowMapPokemon | null {
  if (!isRecord(value)) return null;
  const pokedexId = integer(value.pokedexId);
  const pokemonName = text(value.pokemonName);
  const defaultFormId = integer(value.defaultFormId);
  const forms = integerArray(value.forms ?? []);
  const types = integerArray(value.types);
  const quickMoves = integerArray(value.quickMoves ?? []);
  const chargedMoves = integerArray(value.chargedMoves ?? []);
  const eliteQuickMoves = integerArray(value.eliteQuickMoves ?? []);
  const eliteChargedMoves = integerArray(value.eliteChargedMoves ?? []);
  if (
    pokedexId === null || !pokemonName || defaultFormId === null
    || !forms || !types?.length || !quickMoves || !chargedMoves
    || !eliteQuickMoves || !eliteChargedMoves
  ) return null;
  const evolutions = Array.isArray(value.evolutions)
    ? value.evolutions.flatMap((entry) => normalizeEvolution(entry) ?? [])
    : [];
  const sizeSettings = Array.isArray(value.sizeSettings)
    ? value.sizeSettings.flatMap((entry) => normalizeSizeSetting(entry) ?? [])
    : undefined;
  const costumeOverrideEvos = Array.isArray(value.costumeOverrideEvos)
    ? value.costumeOverrideEvos.flatMap(
        (entry) => normalizeCostumeOverrideEvolution(entry) ?? [],
      )
    : undefined;
  return {
    pokedexId,
    pokemonName,
    defaultFormId,
    forms,
    types,
    quickMoves,
    chargedMoves,
    eliteQuickMoves,
    eliteChargedMoves,
    evolutions,
    ...(finiteNumber(value.attack) !== undefined
      ? { attack: finiteNumber(value.attack) }
      : {}),
    ...(finiteNumber(value.defense) !== undefined
      ? { defense: finiteNumber(value.defense) }
      : {}),
    ...(finiteNumber(value.stamina) !== undefined
      ? { stamina: finiteNumber(value.stamina) }
      : {}),
    ...(text(value.generation) ? { generation: text(value.generation) as string } : {}),
    ...(integer(value.genId) !== null ? { genId: integer(value.genId) as number } : {}),
    ...(finiteNumber(value.height) !== undefined ? { height: finiteNumber(value.height) } : {}),
    ...(finiteNumber(value.weight) !== undefined ? { weight: finiteNumber(value.weight) } : {}),
    ...Object.fromEntries(
      ['legendary', 'mythic', 'ultraBeast', 'gymDefenderEligible', 'tradable', 'transferable']
        .flatMap((key) => {
          const parsed = optionalBoolean(value[key]);
          return parsed === undefined ? [] : [[key, parsed]];
        }),
    ),
    ...Object.fromEntries(
      [
        'buddyGroupNumber', 'buddyDistance', 'buddyMegaEnergy',
        'thirdMoveStardust', 'thirdMoveCandy', 'purificationDust',
        'purificationCandy',
      ].flatMap((key) => {
        const parsed = finiteNumber(value[key]);
        return parsed === undefined ? [] : [[key, parsed]];
      }),
    ),
    ...(sizeSettings ? { sizeSettings } : {}),
    ...(costumeOverrideEvos ? { costumeOverrideEvos } : {}),
  };
}

function normalizePvpBuffs(value: unknown): WatWowMapPvpBuffs | undefined {
  if (!isRecord(value)) return undefined;
  const result: WatWowMapPvpBuffs = {};
  const keys = [
    'attackerAttackStatStageChange',
    'attackerDefenseStatStageChange',
    'targetAttackStatStageChange',
    'targetDefenseStatStageChange',
    'buffActivationChance',
  ] as const;
  for (const key of keys) {
    const parsed = finiteNumber(value[key]);
    if (parsed !== undefined) result[key] = parsed;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeMove(value: unknown): WatWowMapMove | null {
  if (!isRecord(value)) return null;
  const moveId = integer(value.moveId);
  const moveName = text(value.moveName);
  const proto = text(value.proto);
  const type = integer(value.type);
  if (moveId === null || !moveName || !proto || type === null || typeof value.fast !== 'boolean') {
    return null;
  }
  return {
    moveId,
    moveName,
    proto,
    fast: value.fast,
    type,
    ...(finiteNumber(value.power) !== undefined ? { power: finiteNumber(value.power) } : {}),
    ...(finiteNumber(value.durationMs) !== undefined
      ? { durationMs: finiteNumber(value.durationMs) }
      : {}),
    ...(finiteNumber(value.energyDelta) !== undefined
      ? { energyDelta: finiteNumber(value.energyDelta) }
      : {}),
    ...(finiteNumber(value.pvpPower) !== undefined
      ? { pvpPower: finiteNumber(value.pvpPower) }
      : {}),
    ...(finiteNumber(value.pvpEnergyDelta) !== undefined
      ? { pvpEnergyDelta: finiteNumber(value.pvpEnergyDelta) }
      : {}),
    ...(finiteNumber(value.pvpDurationTurns) !== undefined
      ? { pvpDurationTurns: finiteNumber(value.pvpDurationTurns) }
      : {}),
    ...(finiteNumber(value.criticalChance) !== undefined
      ? { criticalChance: finiteNumber(value.criticalChance) }
      : {}),
    ...(normalizePvpBuffs(value.pvpBuffs)
      ? { pvpBuffs: normalizePvpBuffs(value.pvpBuffs) }
      : {}),
  };
}

function normalizeForm(value: unknown): WatWowMapForm | null {
  if (!isRecord(value)) return null;
  const formId = integer(value.formId);
  const formName = text(value.formName);
  const proto = text(value.proto);
  if (formId === null || !formName || !proto) return null;
  const evolutions = Array.isArray(value.evolutions)
    ? value.evolutions.flatMap((entry) => normalizeEvolution(entry) ?? [])
    : undefined;
  const tempEvolutions = Array.isArray(value.tempEvolutions)
    ? value.tempEvolutions.flatMap((entry) => normalizeTemporaryEvolution(entry) ?? [])
    : undefined;
  const costumeOverrideEvos = Array.isArray(value.costumeOverrideEvos)
    ? value.costumeOverrideEvos.flatMap(
        (entry) => normalizeCostumeOverrideEvolution(entry) ?? [],
      )
    : undefined;
  const result: WatWowMapForm = {
    formId,
    formName,
    proto,
    ...(optionalBoolean(value.isCostume) !== undefined
      ? { isCostume: optionalBoolean(value.isCostume) }
      : {}),
    ...(evolutions ? { evolutions } : {}),
    ...(tempEvolutions ? { tempEvolutions } : {}),
    ...(costumeOverrideEvos ? { costumeOverrideEvos } : {}),
  };
  for (const key of [
    'attack', 'defense', 'stamina', 'height', 'weight',
    'purificationDust', 'purificationCandy',
  ] as const) {
    const parsed = finiteNumber(value[key]);
    if (parsed !== undefined) result[key] = parsed;
  }
  for (const key of [
    'types', 'quickMoves', 'chargedMoves', 'eliteQuickMoves', 'eliteChargedMoves',
  ] as const) {
    const parsed = integerArray(value[key]);
    if (parsed) result[key] = parsed;
  }
  return result;
}

function normalizeCostume(value: unknown): WatWowMapCostume | null {
  if (!isRecord(value)) return null;
  const id = integer(value.id);
  const name = text(value.name);
  const proto = text(value.proto);
  return id === null || !name || !proto || typeof value.noEvolve !== 'boolean'
    ? null
    : { id, name, proto, noEvolve: value.noEvolve };
}

function normalizeItem(value: unknown): WatWowMapItem | null {
  if (!isRecord(value)) return null;
  const itemId = integer(value.itemId);
  const itemName = text(value.itemName);
  const proto = text(value.proto);
  if (itemId === null || !itemName || !proto) return null;
  return {
    itemId,
    itemName,
    proto,
    ...(text(value.type) ? { type: text(value.type) as string } : {}),
    ...(text(value.category) ? { category: text(value.category) as string } : {}),
  };
}

function normalizeEncounter(value: unknown): WatWowMapInvasionEncounter | null {
  if (!isRecord(value)) return null;
  const position = text(value.position);
  if (!position) return null;
  const id = integer(value.id);
  return { position, ...(id !== null ? { id } : {}) };
}

function normalizeInvasion(value: unknown): WatWowMapInvasion | null {
  if (!isRecord(value)) return null;
  const id = integer(value.id);
  const type = text(value.type);
  const gender = integer(value.gender);
  const grunt = text(value.grunt);
  const proto = text(value.proto);
  const encounters = Array.isArray(value.encounters)
    ? value.encounters.flatMap((entry) => normalizeEncounter(entry) ?? [])
    : null;
  if (
    id === null || !type || gender === null || !grunt || !proto || !encounters
    || typeof value.active !== 'boolean'
    || typeof value.firstReward !== 'boolean'
    || typeof value.secondReward !== 'boolean'
    || typeof value.thirdReward !== 'boolean'
  ) return null;
  return {
    id,
    type,
    gender,
    grunt,
    proto,
    active: value.active,
    firstReward: value.firstReward,
    secondReward: value.secondReward,
    thirdReward: value.thirdReward,
    encounters,
  };
}

function normalizeRaidLevel(value: unknown): WatWowMapRaidLevelDefinition | null {
  if (!isRecord(value)) return null;
  const id = integer(value.id);
  const formatted = text(value.formatted);
  const proto = text(value.proto);
  return id === null || !formatted || !proto ? null : { id, formatted, proto };
}

function normalizeType(value: unknown): WatWowMapType | null {
  if (!isRecord(value)) return null;
  const typeId = integer(value.typeId);
  const typeName = text(value.typeName);
  const strengths = integerArray(value.strengths);
  const weaknesses = integerArray(value.weaknesses);
  const veryWeakAgainst = integerArray(value.veryWeakAgainst);
  const immunes = integerArray(value.immunes);
  const weakAgainst = integerArray(value.weakAgainst);
  const resistances = integerArray(value.resistances);
  if (
    typeId === null || !typeName || !strengths || !weaknesses
    || !veryWeakAgainst || !immunes || !weakAgainst || !resistances
  ) return null;
  return {
    typeId,
    typeName,
    strengths,
    weaknesses,
    veryWeakAgainst,
    immunes,
    weakAgainst,
    resistances,
  };
}

function normalizeWeather(value: unknown): WatWowMapWeather | null {
  if (!isRecord(value)) return null;
  const weatherId = integer(value.weatherId);
  const weatherName = text(value.weatherName);
  const proto = text(value.proto);
  const types = integerArray(value.types);
  return weatherId === null || !weatherName || !proto || !types
    ? null
    : { weatherId, weatherName, proto, types };
}

function normalizeQuestDefinition(value: unknown): WatWowMapQuestDefinition | null {
  if (!isRecord(value)) return null;
  const questId = integer(value.questId);
  const proto = text(value.proto);
  const formatted = text(value.formatted);
  return questId === null || !proto || !formatted
    ? null
    : { questId, proto, formatted };
}

export function parseWatWowMapPokemonCollection(value: unknown): WatWowMapPokemon[] {
  return normalizedArray(value, normalizePokemon);
}

export function parseWatWowMapPokemon(value: unknown): WatWowMapPokemon {
  const pokemon = normalizePokemon(value);
  if (!pokemon) throw new Error('Invalid WatWowMap Pokémon.');
  return pokemon;
}

export function parseWatWowMapMoveCollection(value: unknown): WatWowMapMove[] {
  return normalizedArray(value, normalizeMove);
}

export function parseWatWowMapMove(value: unknown): WatWowMapMove {
  const move = normalizeMove(value);
  if (!move) throw new Error('Invalid WatWowMap move.');
  return move;
}

export function parseWatWowMapInvasions(value: unknown): WatWowMapInvasion[] {
  return normalizedArray(value, normalizeInvasion);
}

export function parseWatWowMapTranslations(
  value: unknown,
): WatWowMapTranslationEntries {
  const entries: [string, string][] = Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const key = text(entry.key);
        const translated = text(entry.value);
        return key && translated ? [[key, translated]] : [];
      })
    : isRecord(value)
      ? Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        )
      : [];
  if (entries.length === 0) throw new Error('No translations found.');
  return Object.fromEntries(entries);
}

export function parseWatWowMapTranslationLocale(
  value: unknown,
): WatWowMapTranslationLocale {
  if (!isRecord(value)) throw new Error('Expected a locale object.');
  const result: WatWowMapTranslationLocale = {};
  for (const [category, entries] of Object.entries(value)) {
    try {
      (result as Record<string, WatWowMapTranslationEntries>)[category] =
        parseWatWowMapTranslations(entries);
    } catch {
      // Unknown or empty future categories do not invalidate useful locale data.
    }
  }
  if (Object.keys(result).length === 0) throw new Error('No locale categories found.');
  return result;
}

function safeNumericId(id: number): string {
  if (!Number.isInteger(id) || id < 0) throw new RangeError('ID must be a non-negative integer.');
  return String(id);
}

export function createWatWowMapClient() {
  const transport = createExternalJsonClient({ source: 'watwowmap' });
  return {
    fetchPokemonCollection: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.pokemon,
        parseWatWowMapPokemonCollection,
        options,
      ),
    fetchPokemonById: (id: number, options?: ExternalDataRequestOptions) =>
      transport.request(
        `${WATWOWMAP_DATA_BASE_URL}/pokemon/${safeNumericId(id)}.json`,
        parseWatWowMapPokemon,
        options,
      ),
    fetchMoveCollection: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.moves,
        parseWatWowMapMoveCollection,
        options,
      ),
    fetchMoveById: (id: number, options?: ExternalDataRequestOptions) =>
      transport.request(
        `${WATWOWMAP_DATA_BASE_URL}/moves/${safeNumericId(id)}.json`,
        parseWatWowMapMove,
        options,
      ),
    fetchForms: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.forms,
        (value) => normalizedArray(value, normalizeForm),
        options,
      ),
    fetchCostumes: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.costumes,
        (value) => normalizedArray(value, normalizeCostume),
        options,
      ),
    fetchItems: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.items,
        (value) => normalizedArray(value, normalizeItem),
        options,
      ),
    fetchInvasions: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.invasions,
        parseWatWowMapInvasions,
        options,
      ),
    fetchRaidLevelDefinitions: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.raidLevelDefinitions,
        (value) => normalizedArray(value, normalizeRaidLevel),
        options,
      ),
    fetchTypes: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.types,
        (value) => normalizedArray(value, normalizeType),
        options,
      ),
    fetchWeather: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.weather,
        (value) => normalizedArray(value, normalizeWeather),
        options,
      ),
    fetchQuestConditions: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.questConditions,
        (value) => normalizedArray(value, normalizeQuestDefinition),
        options,
      ),
    fetchQuestRewardTypes: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.questRewardTypes,
        (value) => normalizedArray(value, normalizeQuestDefinition),
        options,
      ),
    fetchQuestTypes: (options?: ExternalDataRequestOptions) =>
      transport.request(
        WATWOWMAP_DATASETS.questTypes,
        (value) => normalizedArray(value, normalizeQuestDefinition),
        options,
      ),
    fetchJapaneseTranslationLocale: (options?: ExternalDataRequestOptions) =>
      transport.request(
        `${WATWOWMAP_DATA_BASE_URL}/translations/ja.json`,
        parseWatWowMapTranslationLocale,
        options,
      ),
    fetchJapaneseTranslationCategory: (
      category: WatWowMapTranslationCategory,
      options?: ExternalDataRequestOptions,
    ) => transport.request(
      `${WATWOWMAP_DATA_BASE_URL}/translations/ja/${category}.json`,
      parseWatWowMapTranslations,
      options,
    ),
  };
}

export const watWowMapClient = createWatWowMapClient();
