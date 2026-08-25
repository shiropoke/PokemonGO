import type { FilterChipOption } from '../components/FilterChips';
import { getTypeLabelJa } from '../constants/typeMeta';
import { POKEMON_TYPES } from '../types/gameData';
import type { RocketLineup } from '../types/scrapedDuck';
import { matchesSearchQuery } from './search';

export const ROCKET_TYPE_ALL = 'all';
export const ROCKET_TYPE_NONE = 'none';
export const ROCKET_DIALOGUE_ALL = '__all_dialogues__';

export type RocketTypeFilter = string;
export type RocketDialogueFilter = string;

export interface RocketFilters {
  query: string;
  type: RocketTypeFilter;
  dialogue: RocketDialogueFilter;
}

export function lineupMatches(lineup: RocketLineup, query: string): boolean {
  const pokemon = [
    ...lineup.firstPokemon,
    ...lineup.secondPokemon,
    ...lineup.thirdPokemon,
  ];
  return matchesSearchQuery(query, [
    lineup.name,
    lineup.displayName,
    lineup.title,
    lineup.titleLabel,
    lineup.type ?? '',
    lineup.type ? getTypeLabelJa(lineup.type) : '',
    ...lineup.dialogues,
    ...pokemon.flatMap((candidate) => [candidate.name, candidate.displayName]),
  ]);
}

export function buildRocketTypeOptions(
  lineups: readonly RocketLineup[],
): FilterChipOption<RocketTypeFilter>[] {
  const existing = new Set(lineups.flatMap((lineup) => lineup.type ? [lineup.type] : []));
  const knownOptions = POKEMON_TYPES
    .filter((type) => existing.delete(type))
    .map((type) => ({ value: type, label: getTypeLabelJa(type) }));
  const unknownOptions = [...existing]
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((type) => ({ value: type, label: getTypeLabelJa(type) }));
  const noneOption = lineups.some((lineup) => lineup.type === null)
    ? [{ value: ROCKET_TYPE_NONE, label: 'タイプなし' }]
    : [];
  return [
    { value: ROCKET_TYPE_ALL, label: 'すべて' },
    ...knownOptions,
    ...unknownOptions,
    ...noneOption,
  ];
}

export function buildRocketDialogueOptions(lineups: readonly RocketLineup[]): string[] {
  return [...new Set(lineups.flatMap((lineup) => lineup.dialogues))];
}

export function filterRocketLineups(
  lineups: readonly RocketLineup[],
  filters: RocketFilters,
): RocketLineup[] {
  return lineups.filter((lineup) => {
    const typeMatches = filters.type === ROCKET_TYPE_ALL
      || (filters.type === ROCKET_TYPE_NONE ? lineup.type === null : lineup.type === filters.type);
    const dialogueMatches = filters.dialogue === ROCKET_DIALOGUE_ALL
      || lineup.dialogues.includes(filters.dialogue);
    return typeMatches && dialogueMatches && lineupMatches(lineup, filters.query);
  });
}
