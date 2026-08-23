import type { ScrapedDuckEvent } from '../types/events';
import {
  localizeExternalPokemonName,
  stripExternalMarkup,
} from './scrapedDuckLocalization';

export interface EventSummary {
  description?: string;
  bonuses: string[];
  pokemon: string[];
  other: string[];
}

const MAX_SUMMARY_ITEMS = 12;
const MAX_TEXT_LENGTH = 240;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = stripExternalMarkup(value).trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_TEXT_LENGTH);
}

function addUnique(target: string[], value: unknown): void {
  const text = cleanText(value);
  if (!text || target.length >= MAX_SUMMARY_ITEMS) return;
  const normalized = text.normalize('NFKC').toLocaleLowerCase('en-US');
  if (
    target.some(
      (item) => item.normalize('NFKC').toLocaleLowerCase('en-US') === normalized,
    )
  ) {
    return;
  }
  target.push(text);
}

interface PokemonSummaryItem {
  name: string;
  canBeShiny: boolean;
}

function readPokemon(
  value: unknown,
  pokemonByName: Map<string, PokemonSummaryItem>,
  shinyOverride = false,
): void {
  const record = isRecord(value) ? value : null;
  const rawName = cleanText(record?.name ?? value);
  if (!rawName) return;

  const name = localizeExternalPokemonName(rawName);
  const key = name.normalize('NFKC').toLocaleLowerCase('ja-JP');
  const existing = pokemonByName.get(key);
  const canBeShiny = shinyOverride || record?.canBeShiny === true;
  if (existing) {
    existing.canBeShiny ||= canBeShiny;
    return;
  }
  if (pokemonByName.size >= MAX_SUMMARY_ITEMS) return;
  pokemonByName.set(key, { name, canBeShiny });
}

function readPokemonList(
  value: unknown,
  pokemonByName: Map<string, PokemonSummaryItem>,
  shinyOverride = false,
): void {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    readPokemon(item, pokemonByName, shinyOverride);
  }
}

function readTextPropertyList(
  value: unknown,
  target: string[],
  property: string,
): void {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (isRecord(item)) addUnique(target, item[property]);
  }
}

/**
 * ScrapedDuckの公式Events仕様で確認できる構造だけを読み取ります。
 * 未知キーを再帰的に表示しないことで、仕様変更や想定外データを安全に無視します。
 */
export function parseEventSummary(event: ScrapedDuckEvent): EventSummary {
  const summary: EventSummary = {
    bonuses: [],
    pokemon: [],
    other: [],
  };
  if (!isRecord(event.extraData)) return summary;

  const pokemonByName = new Map<string, PokemonSummaryItem>();
  const generic = isRecord(event.extraData.generic)
    ? event.extraData.generic
    : null;
  const spotlight = isRecord(event.extraData.spotlight)
    ? event.extraData.spotlight
    : null;
  const breakthrough = isRecord(event.extraData.breakthrough)
    ? event.extraData.breakthrough
    : null;
  const raidBattles = isRecord(event.extraData.raidbattles)
    ? event.extraData.raidbattles
    : null;
  const communityDay = isRecord(event.extraData.communityday)
    ? event.extraData.communityday
    : null;

  if (spotlight) {
    addUnique(summary.bonuses, spotlight.bonus);
    readPokemon(spotlight, pokemonByName);
    readPokemonList(spotlight.list, pokemonByName);
  }

  if (breakthrough) readPokemon(breakthrough, pokemonByName);

  if (raidBattles) {
    readPokemonList(raidBattles.bosses, pokemonByName);
    readPokemonList(raidBattles.shinies, pokemonByName, true);
  }

  if (communityDay) {
    readPokemonList(communityDay.spawns, pokemonByName);
    readPokemonList(communityDay.shinies, pokemonByName, true);
    readTextPropertyList(communityDay.bonuses, summary.bonuses, 'text');
    if (Array.isArray(communityDay.bonusDisclaimers)) {
      for (const disclaimer of communityDay.bonusDisclaimers) {
        addUnique(summary.other, disclaimer);
      }
    }
  }

  if (generic?.hasSpawns === true) addUnique(summary.other, '野生出現あり');
  if (generic?.hasFieldResearchTasks === true) {
    addUnique(summary.other, 'フィールドリサーチあり');
  }

  summary.pokemon = [...pokemonByName.values()].map(({ name, canBeShiny }) =>
    canBeShiny ? `${name}（色違いの可能性あり）` : name,
  );
  return summary;
}
