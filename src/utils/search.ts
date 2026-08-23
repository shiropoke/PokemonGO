import { SITE_PAGES } from '../constants/sitePages';
import type { Page } from '../types/navigation';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { RaidBoss } from '../types/scrapedDuck';
import { getEventTypeLabel, localizeEventTitle } from './eventLocalization';
import { getRaidTierLabel } from './scrapedDuckLocalization';

export type SearchMatchRank = 0 | 1 | 2;

interface SearchResultBase {
  id: string;
  title: string;
  subtitle: string;
  rank: SearchMatchRank;
}

export interface PokemonGlobalSearchResult extends SearchResultBase {
  kind: 'pokemon';
  speciesId: string;
  dex: number;
}

export interface EventGlobalSearchResult extends SearchResultBase {
  kind: 'event';
  eventID: string;
}

export interface RaidGlobalSearchResult extends SearchResultBase {
  kind: 'raid';
  raidId: string;
}

export interface PageGlobalSearchResult extends SearchResultBase {
  kind: 'page';
  page: Page;
}

export type GlobalSearchResult =
  | PokemonGlobalSearchResult
  | EventGlobalSearchResult
  | RaidGlobalSearchResult
  | PageGlobalSearchResult;

export interface GlobalSearchGroups {
  pokemon: PokemonGlobalSearchResult[];
  events: EventGlobalSearchResult[];
  raids: RaidGlobalSearchResult[];
  pages: PageGlobalSearchResult[];
}

export interface GlobalSearchSource {
  pokemon: readonly Pokemon[];
  events: readonly ScrapedDuckEvent[];
  raids: readonly RaidBoss[];
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replaceAll('_', ' ')
    .replace(/[()（）\-‐‑‒–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchMatchRank(
  query: string,
  candidates: readonly string[],
): SearchMatchRank | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const normalizedCandidates = candidates
    .map(normalizeSearchText)
    .filter(Boolean);
  if (normalizedCandidates.some((candidate) => candidate === normalizedQuery)) {
    return 0;
  }
  if (normalizedCandidates.some((candidate) => candidate.startsWith(normalizedQuery))) {
    return 1;
  }

  const words = normalizedQuery.split(' ');
  const combinedTarget = normalizedCandidates.join(' ');
  return words.every((word) => combinedTarget.includes(word)) ? 2 : null;
}

function pokemonCandidates(pokemon: Pokemon): string[] {
  return [
    pokemon.displayName,
    pokemon.speciesName,
    pokemon.speciesId,
    String(pokemon.dex),
    String(pokemon.dex).padStart(3, '0'),
  ];
}

export interface PokemonSearchMatch {
  pokemon: Pokemon;
  rank: SearchMatchRank;
}

/** PokémonSelectorとグローバル検索で共通利用する検索・順位付けです。 */
export function searchPokemon(
  pokemon: readonly Pokemon[],
  query: string,
): PokemonSearchMatch[] {
  if (!normalizeSearchText(query)) {
    return pokemon.map((entry) => ({ pokemon: entry, rank: 2 }));
  }

  return pokemon
    .flatMap((entry) => {
      const rank = getSearchMatchRank(query, pokemonCandidates(entry));
      return rank === null ? [] : [{ pokemon: entry, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.pokemon.dex - b.pokemon.dex ||
        a.pokemon.displayName.localeCompare(b.pokemon.displayName, 'ja-JP'),
    );
}

function sortResults<T extends SearchResultBase>(results: T[]): T[] {
  return results.sort(
    (a, b) =>
      a.rank - b.rank || a.title.localeCompare(b.title, 'ja-JP') || a.id.localeCompare(b.id),
  );
}

function pageResults(query: string): PageGlobalSearchResult[] {
  if (!normalizeSearchText(query)) {
    return SITE_PAGES.filter(({ popularSearch }) => popularSearch).map(
      ({ page, label }) => ({
        kind: 'page',
        id: `page-${page}`,
        page,
        title: label,
        subtitle: 'サイト内ページ',
        rank: 0,
      }),
    );
  }

  return sortResults(
    SITE_PAGES.flatMap(({ page, label, keywords }) => {
      const rank = getSearchMatchRank(query, [label, ...keywords]);
      return rank === null
        ? []
        : [{
            kind: 'page' as const,
            id: `page-${page}`,
            page,
            title: label,
            subtitle: 'サイト内ページ',
            rank,
          }];
    }),
  );
}

export function searchGlobalData(
  source: GlobalSearchSource,
  query: string,
): GlobalSearchGroups {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return { pokemon: [], events: [], raids: [], pages: pageResults('') };
  }

  const pokemon = searchPokemon(source.pokemon, query).map(({ pokemon: entry, rank }) => ({
    kind: 'pokemon' as const,
    id: `pokemon-${entry.speciesId}`,
    speciesId: entry.speciesId,
    dex: entry.dex,
    title: entry.displayName,
    subtitle: `図鑑No. ${entry.dex || '—'}・個体値チェッカーで見る`,
    rank,
  }));

  const events = sortResults(
    source.events.flatMap((event) => {
      const title = localizeEventTitle(event.name);
      const typeLabel = getEventTypeLabel(event.eventType);
      const rank = getSearchMatchRank(query, [
        title,
        event.name,
        event.heading ?? '',
        event.eventType,
        typeLabel,
        event.eventID,
      ]);
      return rank === null
        ? []
        : [{
            kind: 'event' as const,
            id: `event-${event.eventID}`,
            eventID: event.eventID,
            title,
            subtitle: typeLabel,
            rank,
          }];
    }),
  );

  const raids = sortResults(
    source.raids.flatMap((raid) => {
      const tierLabel = getRaidTierLabel(raid.tier);
      const rank = getSearchMatchRank(query, [
        raid.displayName,
        raid.name,
        raid.speciesId ?? '',
        raid.tier,
        tierLabel,
        raid.id,
      ]);
      return rank === null
        ? []
        : [{
            kind: 'raid' as const,
            id: raid.id,
            raidId: raid.id,
            title: raid.displayName,
            subtitle: `${tierLabel}${raid.isShadow ? '・シャドウ' : ''}`,
            rank,
          }];
    }),
  );

  return { pokemon, events, raids, pages: pageResults(query) };
}
