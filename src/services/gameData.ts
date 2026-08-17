import { POKEMON_TYPES } from '../types/gameData';
import type {
  EvolutionTarget,
  GameData,
  GameMoveData,
  GamePokemonData,
  PokemonType,
  PowerUpCostData,
  PowerUpCostTable,
  TypeEffectivenessChart,
} from '../types/gameData';

export const POKEMINERS_GAME_MASTER_URL =
  'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json';
export const POKEMINERS_JAPANESE_TEXT_URL =
  'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_japanese.json';
export const GAME_DATA_URL = `${import.meta.env.BASE_URL}data/game-data.json`;

let memoryData: GameData | null = null;
let inFlight: Promise<GameData> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPokemonType(value: unknown): value is PokemonType {
  return typeof value === 'string' && POKEMON_TYPES.some((type) => type === value);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function readEvolutionTargets(value: unknown): EvolutionTarget[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.speciesId !== 'string') return [];
    return [{
      speciesId: entry.speciesId,
      ...(isFiniteNumber(entry.candyCost) && entry.candyCost > 0
        ? { candyCost: entry.candyCost }
        : {}),
    }];
  });
}

function readPokemon(value: unknown): Record<string, GamePokemonData> {
  if (!isRecord(value)) return {};
  const result: Record<string, GamePokemonData> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isRecord(raw) || typeof raw.speciesId !== 'string') continue;
    const types = Array.isArray(raw.types) ? raw.types.filter(isPokemonType) : [];
    if (types.length === 0) continue;
    result[key] = {
      speciesId: raw.speciesId,
      types,
      fastMoveIds: readStringArray(raw.fastMoveIds),
      chargedMoveIds: readStringArray(raw.chargedMoveIds),
      eliteFastMoveIds: readStringArray(raw.eliteFastMoveIds),
      eliteChargedMoveIds: readStringArray(raw.eliteChargedMoveIds),
      evolutions: readEvolutionTargets(raw.evolutions),
    };
  }
  return result;
}

function readMetricRecord(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, number] => isFiniteNumber(entry[1]),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readMoves(value: unknown): Record<string, GameMoveData> {
  if (!isRecord(value)) return {};
  const result: Record<string, GameMoveData> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== 'string' ||
      typeof raw.name !== 'string' ||
      !isPokemonType(raw.type) ||
      (raw.kind !== 'fast' && raw.kind !== 'charged')
    ) continue;
    result[key] = {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      kind: raw.kind,
      ...(readMetricRecord(raw.pve) ? { pve: readMetricRecord(raw.pve) } : {}),
      ...(readMetricRecord(raw.pvp) ? { pvp: readMetricRecord(raw.pvp) } : {}),
    };
  }
  return result;
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter(isFiniteNumber) : [];
}

function readPowerUpTable(value: unknown): PowerUpCostTable | null {
  if (!isRecord(value) || !isFiniteNumber(value.maxLevel)) return null;
  const stardustCostByLevel = readNumberArray(value.stardustCostByLevel);
  const candyCostByLevel = readNumberArray(value.candyCostByLevel);
  const xlCandyCostFromLevel40 = readNumberArray(value.xlCandyCostFromLevel40);
  if (
    stardustCostByLevel.length === 0 ||
    candyCostByLevel.length === 0 ||
    xlCandyCostFromLevel40.length === 0
  ) return null;
  return {
    maxLevel: value.maxLevel,
    stardustCostByLevel,
    candyCostByLevel,
    xlCandyCostFromLevel40,
  };
}

function readPowerUp(value: unknown): PowerUpCostData | null {
  if (!isRecord(value) || !isRecord(value.modifiers)) return null;
  const modifiers = value.modifiers;
  const defaultTable = readPowerUpTable(value);
  const modifierKeys = [
    'luckyStardust',
    'shadowStardust',
    'shadowCandy',
    'purifiedStardust',
    'purifiedCandy',
  ] as const;
  if (
    !isFiniteNumber(value.upgradesPerLevel) ||
    !defaultTable ||
    modifierKeys.some((key) => !isFiniteNumber(modifiers[key]))
  ) return null;

  const overrides: Record<string, PowerUpCostTable> = {};
  if (isRecord(value.overrides)) {
    for (const [speciesId, rawTable] of Object.entries(value.overrides)) {
      const table = readPowerUpTable(rawTable);
      if (table) overrides[speciesId] = table;
    }
  }

  return {
    upgradesPerLevel: value.upgradesPerLevel,
    ...defaultTable,
    modifiers: {
      luckyStardust: modifiers.luckyStardust as number,
      shadowStardust: modifiers.shadowStardust as number,
      shadowCandy: modifiers.shadowCandy as number,
      purifiedStardust: modifiers.purifiedStardust as number,
      purifiedCandy: modifiers.purifiedCandy as number,
    },
    overrides,
  };
}

function readTypeEffectiveness(value: unknown): TypeEffectivenessChart | null {
  if (!isRecord(value)) return null;
  const result = {} as TypeEffectivenessChart;
  for (const attackType of POKEMON_TYPES) {
    const rawDefenders = value[attackType];
    if (!isRecord(rawDefenders)) return null;
    const defenders = {} as Record<PokemonType, number>;
    for (const defenderType of POKEMON_TYPES) {
      const scalar = rawDefenders[defenderType];
      if (!isFiniteNumber(scalar) || scalar <= 0) return null;
      defenders[defenderType] = scalar;
    }
    result[attackType] = defenders;
  }
  return result;
}

export function parseGameData(value: unknown): GameData {
  if (!isRecord(value) || !isRecord(value.sources)) {
    throw new Error('ゲームデータの形式が正しくありません。');
  }
  const pokemon = readPokemon(value.pokemon);
  const moves = readMoves(value.moves);
  const powerUp = readPowerUp(value.powerUp);
  const typeEffectiveness = readTypeEffectiveness(value.typeEffectiveness);
  if (
    Object.keys(pokemon).length === 0 ||
    Object.keys(moves).length === 0 ||
    !powerUp ||
    !typeEffectiveness ||
    typeof value.generatedAt !== 'string' ||
    typeof value.version !== 'number' ||
    typeof value.sources.gameMaster !== 'string' ||
    typeof value.sources.japaneseText !== 'string' ||
    typeof value.sources.pokemonBaseData !== 'string'
  ) {
    throw new Error('ゲームデータに必要な項目がありません。');
  }

  return {
    version: value.version,
    generatedAt: value.generatedAt,
    sources: {
      gameMaster: value.sources.gameMaster,
      japaneseText: value.sources.japaneseText,
      pokemonBaseData: value.sources.pokemonBaseData,
    },
    types: [...POKEMON_TYPES],
    typeEffectiveness,
    powerUp,
    moves,
    pokemon,
  };
}

export async function fetchGameData(options: { force?: boolean } = {}): Promise<GameData> {
  if (!options.force && memoryData) return memoryData;
  if (!options.force && inFlight) return inFlight;

  const request = fetch(GAME_DATA_URL, {
    cache: options.force ? 'reload' : 'default',
    headers: { Accept: 'application/json' },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`ゲームデータの取得に失敗しました: ${response.status}`);
    const parsed = parseGameData(await response.json());
    memoryData = parsed;
    return parsed;
  });

  if (options.force) return request;
  inFlight = request.finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function getPokemonGameData(
  data: GameData,
  speciesId: string,
): GamePokemonData | undefined {
  return data.pokemon[speciesId];
}

export function getMove(data: GameData, moveId: string): GameMoveData | undefined {
  return data.moves[moveId];
}
