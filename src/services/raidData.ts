import type { CachedDataSource, DatasetLoadOptions } from '../types/scrapedDuck';
import type { RaidBoss, RaidDataProvider, RaidPokemonDetails } from '../types/raids';
import type { UnifiedMove, UnifiedPokemon } from '../types/unifiedGameData';
import { loadRaids, SCRAPED_DUCK_CACHE_TTL_MS } from './scrapedDuck';
import { fetchUnifiedMoveData, fetchUnifiedPokemonData } from './unifiedGameData';
import { localizeExternalPokemonName, resolveExternalPokemonSpeciesId } from '../utils/scrapedDuckLocalization';

/** ScrapedDuckの既存cacheと同じ間隔で、レイド画面の再検証を行う。 */
export const RAID_DATA_CACHE_TTL_MS = SCRAPED_DUCK_CACHE_TTL_MS;

export interface RaidDataResult {
  data: RaidBoss[];
  fetchedAt: number;
  source: CachedDataSource;
  stale: boolean;
  provider: RaidDataProvider;
}

function normalizeIdentity(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sourceNameWithoutState(name: string): string {
  return name.replace(/^shadow\s+/i, '').trim();
}

function sourceFormLabel(raid: RaidBoss): string {
  const name = sourceNameWithoutState(raid.name);
  if (raid.isMega || /^mega\s+/i.test(name)) {
    const megaSuffix = /^mega\s+.+?\s*\((mega [xy])\)$/i.exec(name)?.[1];
    const trailingVariant = /^mega\s+.+?\s+([xy])$/i.exec(name)?.[1];
    return megaSuffix ?? (trailingVariant ? `Mega ${trailingVariant.toUpperCase()}` : null)
      ?? (/\bmega [xy]\b/i.exec(name)?.[0] ?? 'Mega');
  }
  const parenthesized = /\(([^)]+)\)\s*$/.exec(name)?.[1]?.trim();
  if (parenthesized) return parenthesized;
  const regional = /^(Alolan|Galarian|Hisuian|Paldean)\s+/i.exec(name)?.[1]?.toLowerCase();
  const regionalForms: Readonly<Record<string, string>> = {
    alolan: 'Alola', galarian: 'Galar', hisuian: 'Hisui', paldean: 'Paldea',
  };
  return regional ? regionalForms[regional] ?? regional : 'Normal';
}

function isNormalForm(pokemon: UnifiedPokemon): boolean {
  return pokemon.form.nameEn.trim().toLowerCase() === 'normal'
    || pokemon.form.pogoApi?.trim().toLowerCase() === 'normal';
}

function isMegaForm(pokemon: UnifiedPokemon): boolean {
  return pokemon.form.temporaryEvolutionId !== undefined
    || pokemon.form.nameEn.trim().toLowerCase().startsWith('mega');
}

function matchesForm(pokemon: UnifiedPokemon, sourceForm: string, isMega: boolean): boolean {
  if (isMega) {
    if (!isMegaForm(pokemon)) return false;
    const normalized = normalizeIdentity(sourceForm);
    if (normalized === 'mega') return true;
    return [pokemon.form.nameEn, pokemon.form.nameJa, pokemon.form.pogoApi]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeIdentity(value) === normalized);
  }
  if (sourceForm === 'Normal') return isNormalForm(pokemon);
  const normalized = normalizeIdentity(sourceForm);
  return [pokemon.form.nameEn, pokemon.form.nameJa, pokemon.form.pogoApi]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeIdentity(value) === normalized);
}

/**
 * ScrapedDuckの名前から既存speciesIdを先に求め、formまで一意に一致する場合だけ
 * Unifiedを補完する。Shadowは状態であってformではないため、form照合から除く。
 */
export function findUnifiedPokemonForRaid(
  raid: RaidBoss,
  allPokemon: readonly UnifiedPokemon[],
): UnifiedPokemon | undefined {
  const sourceName = sourceNameWithoutState(raid.name);
  const speciesId = raid.speciesId ?? resolveExternalPokemonSpeciesId(sourceName);
  const form = sourceFormLabel(raid);
  const bySpeciesId = speciesId
    ? allPokemon.filter((pokemon) => pokemon.existingSpeciesId === speciesId)
    : [];
  const exactSpecies = bySpeciesId.filter((pokemon) => matchesForm(pokemon, form, Boolean(raid.isMega)));
  if (exactSpecies.length === 1) return exactSpecies[0];

  // speciesIdが取得できない場合だけ、英語名と明示formの完全一致を許可する。
  const normalizedSource = normalizeIdentity(
    sourceName.replace(/^mega\s+/i, '').replace(/\s*\([^)]*\)\s*$/, ''),
  );
  const exactName = allPokemon.filter((pokemon) =>
    normalizeIdentity(pokemon.names.en.replace(/\s*\([^)]*\)\s*$/, '')) === normalizedSource
    && matchesForm(pokemon, form, Boolean(raid.isMega)),
  );
  return exactName.length === 1 ? exactName[0] : undefined;
}

function resolveMoveNames(ids: readonly string[], movesByKey: ReadonlyMap<string, UnifiedMove>): string[] {
  return ids.flatMap((id) => {
    const move = movesByKey.get(id);
    return move ? [move.names.ja || move.names.en] : [];
  });
}

function toPokemonDetails(
  pokemon: UnifiedPokemon,
  allPokemonByKey: ReadonlyMap<string, UnifiedPokemon>,
  movesByKey: ReadonlyMap<string, UnifiedMove>,
): RaidPokemonDetails {
  const evolutions = pokemon.evolutions.flatMap((evolution) => {
    const target = evolution.targetKey ? allPokemonByKey.get(evolution.targetKey) : undefined;
    return target ? [target.names.ja || target.names.en] : [];
  });
  const moves = {
    fast: resolveMoveNames(pokemon.moves.fast, movesByKey),
    charged: resolveMoveNames(pokemon.moves.charged, movesByKey),
    eliteFast: resolveMoveNames(pokemon.moves.eliteFast, movesByKey),
    eliteCharged: resolveMoveNames(pokemon.moves.eliteCharged, movesByKey),
  };
  return {
    form: pokemon.form.nameJa ?? pokemon.form.nameEn,
    ...(pokemon.stats ? { stats: pokemon.stats } : {}),
    ...(pokemon.maxCp !== undefined ? { maxCp: pokemon.maxCp } : {}),
    ...(pokemon.size ? { size: pokemon.size } : {}),
    ...(pokemon.buddy?.candyDistanceKm !== undefined
      ? { buddyDistanceKm: pokemon.buddy.candyDistanceKm } : {}),
    ...(pokemon.secondMoveCost ? { secondMoveCost: pokemon.secondMoveCost } : {}),
    ...(pokemon.purificationCost ? { purificationCost: pokemon.purificationCost } : {}),
    ...(Object.values(moves).some((list) => list.length > 0) ? { moves } : {}),
    ...(evolutions.length > 0 ? { evolutions } : {}),
  };
}

function enrichRaid(
  raid: RaidBoss,
  allPokemon: readonly UnifiedPokemon[],
  moves: readonly UnifiedMove[],
): RaidBoss {
  const pokemon = findUnifiedPokemonForRaid(raid, allPokemon);
  if (!pokemon) return raid;
  const pokemonByKey = new Map(allPokemon.map((entry) => [entry.key, entry]));
  const movesByKey = new Map(moves.map((entry) => [entry.key, entry]));
  const form = sourceFormLabel(raid);
  const megaVariant = /^Mega ([XY])$/i.exec(form)?.[1]?.toUpperCase();
  const megaName = raid.isMega && !pokemon.names.ja.startsWith('メガ')
    ? `メガ${pokemon.names.ja}${megaVariant ?? ''}`
    : pokemon.names.ja;
  const displayName = raid.isShadow && !megaName.endsWith('（シャドウ）')
    ? `${megaName}（シャドウ）`
    : megaName || localizeExternalPokemonName(raid.name);
  return {
    ...raid,
    displayName,
    pokedexId: pokemon.pokedexId,
    unifiedPokemonKey: pokemon.key,
    speciesId: pokemon.existingSpeciesId ?? raid.speciesId,
    types: [...pokemon.types],
    stats: pokemon.stats ?? null,
    pokemonDetails: toPokemonDetails(pokemon, pokemonByKey, movesByKey),
    sources: {
      membership: 'scrapedduck',
      details: 'unified',
      ...(raid.image ? { image: 'scrapedduck' } : {}),
    },
  };
}

/**
 * 現在出現しているレイドの唯一のmembership sourceはScrapedDuck/Leek Duck。
 * Unified Pokémon Dataの失敗は詳細情報を省略するだけで、レイド一覧を失敗させない。
 */
export async function loadRaidData(options: DatasetLoadOptions = {}): Promise<RaidDataResult> {
  const raids = await loadRaids(options);
  try {
    const [pokemonDataset, moveDataset] = await Promise.all([
      fetchUnifiedPokemonData({ forceRefresh: options.forceRefresh, signal: options.signal }),
      fetchUnifiedMoveData({ forceRefresh: options.forceRefresh, signal: options.signal }),
    ]);
    return {
      ...raids,
      data: raids.data.map((raid) => enrichRaid(raid, pokemonDataset.pokemon, moveDataset.moves)),
      provider: 'scrapedduck',
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { ...raids, provider: 'scrapedduck' };
  }
}
