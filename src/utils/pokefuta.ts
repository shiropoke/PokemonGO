import type { Pokefuta, PokefutaPrefecture, PokefutaRegion } from '../types/pokefuta';
import { matchesSearchQuery } from './search';

export type PokefutaRegionFilter = 'all' | PokefutaRegion;

export interface PokefutaFilters {
  query: string;
  region: PokefutaRegionFilter;
  prefectureSlug: string | null;
}

export function filterPokefuta(
  lids: readonly Pokefuta[],
  filters: PokefutaFilters,
): Pokefuta[] {
  return lids.filter((lid) => {
    if (filters.region !== 'all' && lid.region !== filters.region) return false;
    if (filters.prefectureSlug && lid.prefectureSlug !== filters.prefectureSlug) return false;
    return matchesSearchQuery(filters.query, [
      ...lid.pokemonNames,
      lid.prefecture,
      lid.prefectureSlug,
      lid.municipality,
      lid.locationName,
      lid.address,
      lid.region,
    ]);
  });
}

export function filterPokefutaPrefectures(
  prefectures: readonly PokefutaPrefecture[],
  region: PokefutaRegionFilter,
): PokefutaPrefecture[] {
  return prefectures.filter((prefecture) =>
    region === 'all' || prefecture.region === region);
}

export function getPokefutaPrefecture(
  prefectures: readonly PokefutaPrefecture[],
  slug: string | null,
): PokefutaPrefecture | null {
  return slug ? prefectures.find((prefecture) => prefecture.slug === slug) ?? null : null;
}

