import type { EventCategory } from "../types/events";
import { replacePokemonNamesInText } from "./pokemonLocalization";

const EVENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  event: "イベント",
  "community-day": "コミュニティ・デイ",
  "pokemon-spotlight-hour": "スポットライトアワー",
  "raid-hour": "レイドアワー",
  "raid-day": "レイドデイ",
  "raid-battles": "レイド",
  "raid-weekend": "レイドウィークエンド",
  "elite-raids": "エピックレイド",
  research: "リサーチ",
  "timed-research": "タイムチャレンジ",
  "limited-research": "限定リサーチ",
  "special-research": "スペシャルリサーチ",
  "research-day": "リサーチデイ",
  "go-battle-league": "GOバトルリーグ",
  "go-rocket-takeover": "GOロケット団占拠",
  "team-go-rocket": "GOロケット団",
  "giovanni-special-research": "サカキのスペシャルリサーチ",
  "max-mondays": "マックスマンデー",
  "max-battles": "マックスバトル",
  "choose-your-path": "選べるタイムチャレンジ",
  "pokemon-go-fest": "ポケモン GO Fest",
  "go-pass": "GOパス",
  season: "シーズン",
};

const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  all: "すべて",
  "community-day": "コミュニティ・デイ",
  "spotlight-hour": "スポットライトアワー",
  raid: "レイド",
  research: "リサーチ",
  "battle-league": "GOバトルリーグ",
  rocket: "GOロケット団",
  other: "その他",
};

/**
 * ポケモン GO 日本語公式サイトで表記を確認できた固有タイトルです。
 * 確認できない固有名は追加せず、下の定型句変換か英語原文へフォールバックします。
 */
const VERIFIED_EVENT_TITLES: Readonly<Record<string, string>> = {
  "Choose Your Path: Venom and Vines": "選べるタイムチャレンジ：どく＆くさ",
  "Ultra Unlock: Water Festival": "ウルトラアンロック：ウォーターフェスティバル",
  "Pokémon GO Fest 2026: Mega Finale": "ポケモン GO Fest 2026：メガフィナーレ",
  "Forever Forward": "新たな歩み",
  "GO Pass: August": "GOパス：8月",
};

const ENGLISH_MONTH_LABELS: Readonly<Record<string, string>> = {
  January: "1月",
  February: "2月",
  March: "3月",
  April: "4月",
  May: "5月",
  June: "6月",
  July: "7月",
  August: "8月",
  September: "9月",
  October: "10月",
  November: "11月",
  December: "12月",
};

/** 長い句を先に置き、部分一致で短い句へ崩さない。 */
const COMMON_EVENT_PHRASES: readonly (readonly [string, string])[] = [
  ["Community Day Classic", "復刻コミュニティ・デイ"],
  ["Pokémon Spotlight Hour", "スポットライトアワー"],
  ["Pokémon World Championships", "ポケモンワールドチャンピオンシップス"],
  ["GO Rocket Takeover", "GOロケット団占拠"],
  ["Team GO Rocket", "GOロケット団"],
  ["GO Battle Weekend", "GOバトルウィークエンド"],
  ["GO Battle Day", "GOバトルデイ"],
  ["Super Mega Raid Day", "スーパーメガレイド・デイ"],
  ["Great League Edition", "スーパーリーグバージョン"],
  ["Ultra League Edition", "ハイパーリーグバージョン"],
  ["Master League Edition", "マスターリーグバージョン"],
  ["Mega Edition", "メガバージョン"],
  ["Evolution Cup", "進化カップ"],
  ["Scroll Cup", "かけじくカップ"],
  ["Master League", "マスターリーグ"],
  ["Ultra League", "ハイパーリーグ"],
  ["Great League", "スーパーリーグ"],
  ["Forever Forward", "新たな歩み"],
  ["5-star Raid Battles", "伝説レイドバトル"],
  ["Shadow Raids", "シャドウレイド"],
  ["Mega Raids", "メガレイド"],
  ["Raid Battles", "レイドバトル"],
  ["Raid Weekend", "レイドウィークエンド"],
  ["Community Day", "コミュニティ・デイ"],
  ["Spotlight Hour", "スポットライトアワー"],
  ["Raid Hour", "レイドアワー"],
  ["Raid Day", "レイドデイ"],
  ["Research Day", "リサーチデイ"],
  ["Timed Research", "タイムチャレンジ"],
  ["Limited Research", "限定リサーチ"],
  ["Special Research", "スペシャルリサーチ"],
  ["Max Battle Day", "マックスバトルデイ"],
  ["Max Monday", "マックスマンデー"],
  ["Ultra Unlock", "ウルトラアンロック"],
  ["Adventure Week", "アドベンチャーウィーク"],
  ["Water Festival", "ウォーターフェスティバル"],
  ["Winter Holiday", "ウィンターイベント"],
  ["Halloween", "ハロウィン"],
  ["Hatch Day", "ふかの日"],
  ["GO Pass", "GOパス"],
  ["10th Anniversary Celebration", "10周年記念"],
];

const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function getEventTypeLabel(eventType: string | null | undefined): string {
  const normalized = eventType?.trim().toLowerCase() ?? "";
  return EVENT_TYPE_LABELS[normalized] ?? "その他";
}

export function getEventCategoryLabel(category: EventCategory): string {
  return EVENT_CATEGORY_LABELS[category];
}

/** DOMや外部サービスに依存せず、タイトルで使われるHTML entityだけを安全に戻す。 */
export function decodeEventTitleEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (match, decimal: string | undefined, hexadecimal: string | undefined, named: string | undefined) => {
      if (named) {
        return NAMED_HTML_ENTITIES[named.toLowerCase()] ?? match;
      }

      const codePoint = Number.parseInt(decimal ?? hexadecimal ?? "", hexadecimal ? 16 : 10);
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }

      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    },
  );
}

function replaceEnglishMonths(value: string): string {
  let localized = value;
  for (const [english, japanese] of Object.entries(ENGLISH_MONTH_LABELS)) {
    localized = localized.replace(new RegExp(`\\b${english}\\b`, "g"), japanese);
  }
  return localized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSubjectList(value: string): string {
  return value
    .replace(/,\s+and\s+/gi, "、")
    .replace(/\s+and\s+/gi, "と")
    .replace(/,\s*/g, "、")
    .trim();
}

function translateStructuredTitle(value: string): string | null {
  let match = /^Dynamax (.+) during Max Monday$/i.exec(value);
  if (match) {
    return `マックスマンデー：ダイマックス${formatSubjectList(match[1]!)}`;
  }

  match = /^Mega (.+) in Mega Raids$/i.exec(value);
  if (match) {
    return `メガ${formatSubjectList(match[1]!)}が登場するメガレイド`;
  }

  match = /^Shadow (.+) in Shadow Raids$/i.exec(value);
  if (match) {
    return `シャドウ${formatSubjectList(match[1]!)}が登場するシャドウレイド`;
  }

  match = /^(.+) in 5-star Raid Battles$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}が登場する伝説レイドバトル`;
  }

  match = /^(.+) Community Day Classic$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}の復刻コミュニティ・デイ`;
  }

  match = /^(.+) Community Day$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}のコミュニティ・デイ`;
  }

  match = /^(.+) Spotlight Hour$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}のスポットライトアワー`;
  }

  match = /^(.+) Raid Hour$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}のレイドアワー`;
  }

  match = /^(.+) Super Mega Raid Day$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}のスーパーメガレイド・デイ`;
  }

  match = /^(.+) Raid Day$/i.exec(value);
  if (match) {
    return `${formatSubjectList(match[1]!)}のレイドデイ`;
  }

  match = /^Twitch Drops for (\d{4}) Pokémon World Championships$/i.exec(value);
  if (match) {
    return `ポケモンワールドチャンピオンシップス${match[1]!}：Twitch Drops`;
  }

  return null;
}

function finishJapaneseTitle(value: string): string {
  return formatSubjectList(value)
    .replace(/\s*:\s*/g, "：")
    .replace(/\s*\|\s*/g, "｜")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * ScrapedDuckの英語タイトルを、静的辞書と確認済みの定型句だけで日本語化します。
 * 固有名を推測して翻訳せず、変換できない部分は原文のまま残します。
 */
export function localizeEventTitle(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "名称未設定のイベント";
  }

  const decoded = decodeEventTitleEntities(value).trim();
  if (!decoded) {
    return "名称未設定のイベント";
  }

  const verifiedTitle = VERIFIED_EVENT_TITLES[decoded];
  if (verifiedTitle) {
    return verifiedTitle;
  }

  // Leek DuckとPvPokeで異なる、既知のGiratinaフォーム表記だけを正規化する。
  let localized = decoded
    .replaceAll("Giratina (Altered Forme)", "Giratina (Altered)")
    .replaceAll("Giratina (Origin Forme)", "Giratina (Origin)");

  localized = replaceEnglishMonths(localized);
  localized = replacePokemonNamesInText(localized);

  const structuredTitle = translateStructuredTitle(localized);
  if (structuredTitle) {
    return finishJapaneseTitle(structuredTitle);
  }

  let changed = localized !== decoded;
  for (const [english, japanese] of COMMON_EVENT_PHRASES) {
    const replaced = localized.replace(
      new RegExp(escapeRegExp(english), "gi"),
      japanese,
    );
    if (replaced !== localized) {
      localized = replaced;
      changed = true;
    }
  }

  return changed ? finishJapaneseTitle(localized) : decoded;
}
