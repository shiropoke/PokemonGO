import { createExternalJsonClient } from './externalData';
import type { ExternalDataRequestOptions } from '../types/externalData';
import type {
  PogoApiCurrentPokemonMovesEntry,
  PogoApiMove,
  PogoApiPokemonIdentity,
  PogoApiPokemonStatsEntry,
  PogoApiPokemonTypesEntry,
  PogoApiRaidBoss,
  PogoApiRaidBosses,
  PogoApiResult,
} from '../types/pogoApi';

export const POGO_API_BASE_URL = 'https://pogoapi.net/api/v1';

/** PoGoAPI公式documentationで公開されている、今後利用予定のendpoint。 */
export const POGO_API_ENDPOINTS = {
  apiHashes: `${POGO_API_BASE_URL}/api_hashes.json`,
  pokemonNames: `${POGO_API_BASE_URL}/pokemon_names.json`,
  pokemonStats: `${POGO_API_BASE_URL}/pokemon_stats.json`,
  pokemonTypes: `${POGO_API_BASE_URL}/pokemon_types.json`,
  pokemonMaxCp: `${POGO_API_BASE_URL}/pokemon_max_cp.json`,
  pokemonForms: `${POGO_API_BASE_URL}/pokemon_forms.json`,
  currentPokemonMoves: `${POGO_API_BASE_URL}/current_pokemon_moves.json`,
  fastMoves: `${POGO_API_BASE_URL}/fast_moves.json`,
  chargedMoves: `${POGO_API_BASE_URL}/charged_moves.json`,
  pvpFastMoves: `${POGO_API_BASE_URL}/pvp_fast_moves.json`,
  pvpChargedMoves: `${POGO_API_BASE_URL}/pvp_charged_moves.json`,
  pokemonEvolutions: `${POGO_API_BASE_URL}/pokemon_evolutions.json`,
  pokemonCandyToEvolve: `${POGO_API_BASE_URL}/pokemon_candy_to_evolve.json`,
  pokemonPowerUpRequirements:
    `${POGO_API_BASE_URL}/pokemon_powerup_requirements.json`,
  shinyPokemon: `${POGO_API_BASE_URL}/shiny_pokemon.json`,
  shadowPokemon: `${POGO_API_BASE_URL}/shadow_pokemon.json`,
  nestingPokemon: `${POGO_API_BASE_URL}/nesting_pokemon.json`,
  possibleDittoPokemon: `${POGO_API_BASE_URL}/possible_ditto_pokemon.json`,
  megaPokemon: `${POGO_API_BASE_URL}/mega_pokemon.json`,
  weatherBoosts: `${POGO_API_BASE_URL}/weather_boosts.json`,
  typeEffectiveness: `${POGO_API_BASE_URL}/type_effectiveness.json`,
  playerXpRequirements: `${POGO_API_BASE_URL}/player_xp_requirements.json`,
  levelUpRewards: `${POGO_API_BASE_URL}/levelup_rewards.json`,
  raidBosses: `${POGO_API_BASE_URL}/raid_bosses.json`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function integer(value: unknown): number | null {
  const number = finiteNumber(value);
  return number === null ? null : Math.trunc(number);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter(
    (entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()),
  );
  return strings.length === value.length ? strings : null;
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

function normalizeStats(value: unknown): PogoApiPokemonStatsEntry | null {
  if (!isRecord(value)) return null;
  const pokemonId = integer(value.pokemon_id);
  const pokemonName = nonEmptyString(value.pokemon_name);
  const form = nonEmptyString(value.form);
  const baseAttack = integer(value.base_attack);
  const baseDefense = integer(value.base_defense);
  const baseStamina = integer(value.base_stamina);
  if (
    pokemonId === null || pokemonName === null || form === null
    || baseAttack === null || baseDefense === null || baseStamina === null
  ) return null;
  return {
    pokemon_id: pokemonId,
    pokemon_name: pokemonName,
    form,
    base_attack: baseAttack,
    base_defense: baseDefense,
    base_stamina: baseStamina,
  };
}

function normalizeTypes(value: unknown): PogoApiPokemonTypesEntry | null {
  if (!isRecord(value)) return null;
  const pokemonId = integer(value.pokemon_id);
  const pokemonName = nonEmptyString(value.pokemon_name);
  const form = nonEmptyString(value.form);
  const types = stringArray(value.type);
  if (pokemonId === null || !pokemonName || !form || !types?.length) return null;
  return { pokemon_id: pokemonId, pokemon_name: pokemonName, form, type: types };
}

function normalizeCurrentMoves(
  value: unknown,
): PogoApiCurrentPokemonMovesEntry | null {
  if (!isRecord(value)) return null;
  const pokemonId = integer(value.pokemon_id);
  const pokemonName = nonEmptyString(value.pokemon_name);
  const form = nonEmptyString(value.form);
  const fastMoves = stringArray(value.fast_moves);
  const chargedMoves = stringArray(value.charged_moves);
  const eliteFastMoves = stringArray(value.elite_fast_moves ?? []);
  const eliteChargedMoves = stringArray(value.elite_charged_moves ?? []);
  if (
    pokemonId === null || !pokemonName || !form
    || !fastMoves || !chargedMoves || !eliteFastMoves || !eliteChargedMoves
  ) return null;
  return {
    pokemon_id: pokemonId,
    pokemon_name: pokemonName,
    form,
    fast_moves: fastMoves,
    charged_moves: chargedMoves,
    elite_fast_moves: eliteFastMoves,
    elite_charged_moves: eliteChargedMoves,
  };
}

function optionalNumber(value: unknown): number | undefined {
  return finiteNumber(value) ?? undefined;
}

function normalizeMove(value: unknown): PogoApiMove | null {
  if (!isRecord(value)) return null;
  const moveId = integer(value.move_id);
  const name = nonEmptyString(value.name);
  const type = nonEmptyString(value.type);
  const power = finiteNumber(value.power);
  const energyDelta = finiteNumber(value.energy_delta);
  if (moveId === null || !name || !type || power === null || energyDelta === null) {
    return null;
  }
  const buffs = isRecord(value.buffs)
    ? {
        ...(optionalNumber(value.buffs.activation_chance) !== undefined
          ? { activation_chance: optionalNumber(value.buffs.activation_chance) }
          : {}),
        ...(optionalNumber(value.buffs.attacker_attack_stat_stage_change) !== undefined
          ? { attacker_attack_stat_stage_change:
              optionalNumber(value.buffs.attacker_attack_stat_stage_change) }
          : {}),
        ...(optionalNumber(value.buffs.attacker_defense_stat_stage_change) !== undefined
          ? { attacker_defense_stat_stage_change:
              optionalNumber(value.buffs.attacker_defense_stat_stage_change) }
          : {}),
        ...(optionalNumber(value.buffs.target_attack_stat_stage_change) !== undefined
          ? { target_attack_stat_stage_change:
              optionalNumber(value.buffs.target_attack_stat_stage_change) }
          : {}),
        ...(optionalNumber(value.buffs.target_defense_stat_stage_change) !== undefined
          ? { target_defense_stat_stage_change:
              optionalNumber(value.buffs.target_defense_stat_stage_change) }
          : {}),
      }
    : undefined;
  return {
    move_id: moveId,
    name,
    type,
    power,
    energy_delta: energyDelta,
    ...(optionalNumber(value.duration) !== undefined
      ? { duration: optionalNumber(value.duration) }
      : {}),
    ...(optionalNumber(value.turn_duration) !== undefined
      ? { turn_duration: optionalNumber(value.turn_duration) }
      : {}),
    ...(optionalNumber(value.critical_chance) !== undefined
      ? { critical_chance: optionalNumber(value.critical_chance) }
      : {}),
    ...(optionalNumber(value.stamina_loss_scaler) !== undefined
      ? { stamina_loss_scaler: optionalNumber(value.stamina_loss_scaler) }
      : {}),
    ...(buffs && Object.keys(buffs).length > 0 ? { buffs } : {}),
  };
}

function normalizeRaidBoss(value: unknown): PogoApiRaidBoss | null {
  if (!isRecord(value)) return null;
  const id = integer(value.id);
  const name = nonEmptyString(value.name);
  const form = nonEmptyString(value.form);
  const tier = typeof value.tier === 'string'
    ? nonEmptyString(value.tier)
    : integer(value.tier);
  const types = stringArray(value.type);
  const boostedWeather = stringArray(value.boosted_weather);
  if (
    id === null || !name || !form || tier === null
    || !types?.length || !boostedWeather
    || typeof value.possible_shiny !== 'boolean'
  ) return null;
  return {
    id,
    name,
    form,
    tier,
    type: types,
    boosted_weather: boostedWeather,
    possible_shiny: value.possible_shiny,
    min_unboosted_cp: finiteNumber(value.min_unboosted_cp),
    max_unboosted_cp: finiteNumber(value.max_unboosted_cp),
    min_boosted_cp: finiteNumber(value.min_boosted_cp),
    max_boosted_cp: finiteNumber(value.max_boosted_cp),
  };
}

function normalizeRaidPeriod(
  value: unknown,
  allowEmpty = false,
): Record<string, PogoApiRaidBoss[]> {
  if (!isRecord(value)) throw new Error('Expected a raid tier object.');
  const result: Record<string, PogoApiRaidBoss[]> = {};
  for (const [tier, bosses] of Object.entries(value)) {
    result[tier] = normalizedArray(bosses, normalizeRaidBoss);
  }
  if (!allowEmpty && Object.keys(result).length === 0) {
    throw new Error('No raid tiers found.');
  }
  return result;
}

export function parsePogoApiRaidBosses(value: unknown): PogoApiRaidBosses {
  if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.previous)) {
    throw new Error('Invalid raid boss response.');
  }
  return {
    current: normalizeRaidPeriod(value.current),
    previous: normalizeRaidPeriod(value.previous, true),
  };
}

export function parsePogoApiCurrentPokemonMoves(
  value: unknown,
): PogoApiCurrentPokemonMovesEntry[] {
  return normalizedArray(value, normalizeCurrentMoves);
}

export function parsePogoApiPokemonStats(
  value: unknown,
): PogoApiPokemonStatsEntry[] {
  return normalizedArray(value, normalizeStats);
}

export function parsePogoApiPokemonTypes(
  value: unknown,
): PogoApiPokemonTypesEntry[] {
  return normalizedArray(value, normalizeTypes);
}

export function parsePogoApiMoves(value: unknown): PogoApiMove[] {
  return normalizedArray(value, normalizeMove);
}

export function parsePogoApiPokemonNames(
  value: unknown,
): Record<string, PogoApiPokemonIdentity> {
  if (!isRecord(value)) throw new Error('Expected a Pokémon name object.');
  const result: Record<string, PogoApiPokemonIdentity> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const id = integer(entry.id);
    const name = nonEmptyString(entry.name);
    if (id !== null && name) result[key] = { id, name };
  }
  if (Object.keys(result).length === 0) throw new Error('No Pokémon names found.');
  return result;
}

export function createPogoApiClient() {
  const transport = createExternalJsonClient({ source: 'pogoapi' });
  return {
    fetchRaidBosses: (options?: ExternalDataRequestOptions) =>
      transport.request(
        POGO_API_ENDPOINTS.raidBosses,
        parsePogoApiRaidBosses,
        options,
      ),
    fetchCurrentPokemonMoves: (options?: ExternalDataRequestOptions) =>
      transport.request(
        POGO_API_ENDPOINTS.currentPokemonMoves,
        parsePogoApiCurrentPokemonMoves,
        options,
      ),
    fetchPokemonNames: (options?: ExternalDataRequestOptions) =>
      transport.request(
        POGO_API_ENDPOINTS.pokemonNames,
        parsePogoApiPokemonNames,
        options,
      ),
    fetchPokemonStats: (options?: ExternalDataRequestOptions) =>
      transport.request(
        POGO_API_ENDPOINTS.pokemonStats,
        parsePogoApiPokemonStats,
        options,
      ),
    fetchPokemonTypes: (options?: ExternalDataRequestOptions) =>
      transport.request(
        POGO_API_ENDPOINTS.pokemonTypes,
        parsePogoApiPokemonTypes,
        options,
      ),
    fetchFastMoves: (options?: ExternalDataRequestOptions) =>
      transport.request(POGO_API_ENDPOINTS.fastMoves, parsePogoApiMoves, options),
    fetchChargedMoves: (options?: ExternalDataRequestOptions) =>
      transport.request(POGO_API_ENDPOINTS.chargedMoves, parsePogoApiMoves, options),
    fetchPvpFastMoves: (options?: ExternalDataRequestOptions) =>
      transport.request(POGO_API_ENDPOINTS.pvpFastMoves, parsePogoApiMoves, options),
    fetchPvpChargedMoves: (options?: ExternalDataRequestOptions) =>
      transport.request(POGO_API_ENDPOINTS.pvpChargedMoves, parsePogoApiMoves, options),
  } satisfies Record<string, (...args: never[]) => Promise<PogoApiResult<unknown>>>;
}

export const pogoApiClient = createPogoApiClient();
