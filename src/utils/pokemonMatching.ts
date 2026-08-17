import type { Pokemon } from '../types/pokemon';
import { resolveExternalPokemonSpeciesId } from './scrapedDuckLocalization';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function externalPokemonMatches(
  rawName: string,
  speciesId: string | null | undefined,
  pokemon: Pokemon,
): boolean {
  if (speciesId === pokemon.speciesId) return true;
  const resolved = resolveExternalPokemonSpeciesId(rawName);
  return resolved !== null && resolved === pokemon.speciesId;
}

export function eventTitleMentionsPokemon(
  eventTitle: string,
  pokemon: Pokemon,
): boolean {
  const englishBaseName = pokemon.speciesName.split(' (')[0]?.trim();
  if (!englishBaseName) return false;
  const pattern = new RegExp(
    `(^|[^A-Za-z])${escapeRegex(englishBaseName)}([^A-Za-z]|$)`,
    'i',
  );
  return pattern.test(eventTitle);
}
