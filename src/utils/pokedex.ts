import type { PokemonType } from '../types/gameData';
import type { UnifiedMove, UnifiedPokemon } from '../types/unifiedGameData';
import { matchesSearchQuery } from './search';

export interface PokedexEntry {
  pokedexId: number;
  representative: UnifiedPokemon;
  forms: UnifiedPokemon[];
}

export type PokedexSort = 'dex-asc' | 'dex-desc' | 'name';

export interface PokedexFilters {
  query: string;
  type: PokemonType | 'all';
  generation: string;
  sort: PokedexSort;
}

function isDefaultForm(pokemon: UnifiedPokemon): boolean {
  return pokemon.form.nameEn.trim().toLowerCase() === 'normal'
    || pokemon.form.pogoApi?.trim().toLowerCase() === 'normal';
}

function stableFormOrder(left: UnifiedPokemon, right: UnifiedPokemon): number {
  const leftId = left.form.id ?? Number.MAX_SAFE_INTEGER;
  const rightId = right.form.id ?? Number.MAX_SAFE_INTEGER;
  return leftId - rightId || left.form.key.localeCompare(right.form.key, 'en');
}

/** 同一図鑑番号のフォームをまとめ、Normalを優先して安定した代表を選ぶ。 */
export function buildPokedexEntries(pokemon: readonly UnifiedPokemon[]): PokedexEntry[] {
  const byDex = new Map<number, UnifiedPokemon[]>();
  pokemon.forEach((entry) => {
    const forms = byDex.get(entry.pokedexId) ?? [];
    forms.push(entry);
    byDex.set(entry.pokedexId, forms);
  });
  return [...byDex.entries()]
    .map(([pokedexId, forms]) => {
      const ordered = [...forms].sort(stableFormOrder);
      const representative = ordered.find(isDefaultForm) ?? ordered[0]!;
      return { pokedexId, representative, forms: ordered };
    })
    .sort((left, right) => left.pokedexId - right.pokedexId);
}

function entryMatchesQuery(entry: PokedexEntry, query: string): boolean {
  return matchesSearchQuery(query, [
    entry.representative.names.ja,
    entry.representative.names.en,
    entry.representative.existingSpeciesId ?? '',
    String(entry.pokedexId),
    String(entry.pokedexId).padStart(3, '0'),
    `#${String(entry.pokedexId).padStart(3, '0')}`,
    ...entry.forms.flatMap((form) => [form.form.nameEn, form.form.nameJa ?? '', form.form.key]),
  ]);
}

export function filterPokedexEntries(
  entries: readonly PokedexEntry[],
  filters: PokedexFilters,
): PokedexEntry[] {
  return entries
    .filter((entry) => entryMatchesQuery(entry, filters.query))
    .filter((entry) => {
      const selectedType = filters.type;
      return selectedType === 'all' || entry.forms.some((form) => form.types.includes(selectedType));
    })
    .filter((entry) => filters.generation === 'all'
      || entry.forms.some((form) => String(form.generation?.id ?? '') === filters.generation))
    .sort((left, right) => {
      if (filters.sort === 'dex-desc') return right.pokedexId - left.pokedexId;
      if (filters.sort === 'name') {
        return left.representative.names.ja.localeCompare(right.representative.names.ja, 'ja-JP')
          || left.pokedexId - right.pokedexId;
      }
      return left.pokedexId - right.pokedexId;
    });
}

export function resolveEvolutionTarget(
  targetKey: string | undefined,
  pokemon: readonly UnifiedPokemon[],
): UnifiedPokemon | undefined {
  return targetKey ? pokemon.find((entry) => entry.key === targetKey) : undefined;
}

export function findPokedexPokemonByKey(
  key: string | null,
  pokemon: readonly UnifiedPokemon[],
): UnifiedPokemon | undefined {
  return key ? pokemon.find((entry) => entry.key === key) : undefined;
}

export function resolveMoves(
  keys: readonly string[],
  moves: readonly UnifiedMove[],
): UnifiedMove[] {
  const byKey = new Map(moves.map((move) => [move.key, move]));
  return keys.flatMap((key) => byKey.get(key) ?? []);
}
