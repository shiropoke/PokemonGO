import { SITE_PAGES } from '../constants/sitePages';
import type { Page } from '../types/navigation';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { RaidBoss } from '../types/raids';
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

const HEPBURN_ROMAJI: Readonly<Record<string, string>> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};

const KUNREI_ROMAJI: Readonly<Record<string, string>> = {
  ...HEPBURN_ROMAJI,
  しゃ: 'sya', しゅ: 'syu', しょ: 'syo',
  ちゃ: 'tya', ちゅ: 'tyu', ちょ: 'tyo',
  じゃ: 'zya', じゅ: 'zyu', じょ: 'zyo',
  し: 'si', ち: 'ti', つ: 'tu', ふ: 'hu', じ: 'zi',
  ぢ: 'zi', づ: 'zu',
};

export function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60));
}

function kanaToRomaji(value: string, map: Readonly<Record<string, string>>): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? '';
    if (character === 'ー') {
      const lastVowel = result.match(/[aeiou](?!.*[aeiou])/i)?.[0];
      result += lastVowel ?? '';
      continue;
    }

    const pair = value.slice(index, index + 2);
    const syllable = map[pair] ?? map[character];
    if (character === 'っ') {
      const nextPair = value.slice(index + 1, index + 3);
      const nextSyllable = map[nextPair] ?? map[value[index + 1] ?? ''] ?? '';
      const consonant = nextSyllable.match(/^[^aeiou]/)?.[0];
      result += consonant ?? '';
      continue;
    }
    if (map[pair]) index += 1;
    result += syllable ?? character;
  }
  return result;
}

function collapseLongVowels(value: string): string {
  return value.replace(/([aeiou])\1+/g, '$1');
}

/** 表示文字列から、かな表記と一般的なローマ字表記揺れを検索専用aliasにする。 */
export function createSearchAliases(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  const aliases = new Set<string>([normalized]);
  if (/[ぁ-ゖ]/.test(normalized)) {
    for (const map of [HEPBURN_ROMAJI, KUNREI_ROMAJI]) {
      const romaji = kanaToRomaji(normalized, map);
      aliases.add(romaji);
      aliases.add(collapseLongVowels(romaji));
      // 「レイド」を raido と入力するような、外来語の一般的な入力差も許容する。
      aliases.add(romaji.replaceAll('ei', 'ai'));
    }
  }
  return [...aliases].filter(Boolean);
}

export function normalizeSearchText(value: string): string {
  return katakanaToHiragana(value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP'))
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

  const queryAliases = createSearchAliases(query);
  const candidateAliases = [...new Set(candidates.flatMap(createSearchAliases))];
  if (queryAliases.some((alias) => candidateAliases.includes(alias))) {
    return 0;
  }
  if (queryAliases.some((queryAlias) =>
    candidateAliases.some((candidate) => candidate.startsWith(queryAlias)))) {
    return 1;
  }

  const combinedTarget = candidateAliases.join(' ');
  return queryAliases.some((queryAlias) =>
    queryAlias.split(' ').every((word) => combinedTarget.includes(word)))
    ? 2
    : null;
}

/** ページ固有の一覧順を変えず、共通のかな・ローマ字検索で包含判定だけを行う。 */
export function matchesSearchQuery(
  query: string,
  candidates: readonly string[],
): boolean {
  return !normalizeSearchText(query) || getSearchMatchRank(query, candidates) !== null;
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

/** PokemonSelectorとグローバル検索で共通利用する検索・順位付けです。 */
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
