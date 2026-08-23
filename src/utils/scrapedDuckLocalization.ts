import { getTypeLabelJa as getTypeLabelFromMeta } from '../constants/typeMeta';
import { getPokemonNameJa, replacePokemonNamesInText } from './pokemonLocalization';

const REGIONAL_PREFIXES: Readonly<Record<string, string>> = {
  Alolan: 'alolan',
  Galarian: 'galarian',
  Hisuian: 'hisuian',
  Paldean: 'paldean',
};

const FORM_SUFFIXES: Readonly<Record<string, string>> = {
  Altered: 'altered',
  Origin: 'origin',
};

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function toSpeciesSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/♀/g, '_female')
    .replace(/♂/g, '_male')
    .replace(/[’']/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

interface ExternalPokemonIdentity {
  original: string;
  baseSlug: string;
  regionalSuffix?: string;
  knownFormSuffix?: string;
  unknownFormLabel?: string;
  isMega: boolean;
  isShadow: boolean;
}

function parseExternalPokemonIdentity(englishName: string): ExternalPokemonIdentity {
  const original = englishName.trim();
  let remaining = original;
  let isShadow = false;
  let isMega = false;
  let regionalSuffix: string | undefined;

  if (/^Shadow\s+/i.test(remaining)) {
    isShadow = true;
    remaining = remaining.replace(/^Shadow\s+/i, '');
  }
  if (/^Mega\s+/i.test(remaining)) {
    isMega = true;
    remaining = remaining.replace(/^Mega\s+/i, '');
  }

  for (const [prefix, suffix] of Object.entries(REGIONAL_PREFIXES)) {
    const matcher = new RegExp(`^${prefix}\\s+`, 'i');
    if (matcher.test(remaining)) {
      regionalSuffix = suffix;
      remaining = remaining.replace(matcher, '');
      break;
    }
  }

  const formMatch = /^(.*?)\s*\(([^)]+)\)$/.exec(remaining);
  const baseName = (formMatch?.[1] ?? remaining).trim();
  const knownFormSuffix = formMatch?.[2]
    ? FORM_SUFFIXES[formMatch[2].trim()]
    : undefined;
  const unknownFormLabel = formMatch?.[2] && !knownFormSuffix
    ? formMatch[2].trim()
    : undefined;

  return {
    original,
    baseSlug: toSpeciesSlug(baseName),
    regionalSuffix,
    knownFormSuffix,
    unknownFormLabel,
    isMega,
    isShadow,
  };
}

export function resolveExternalPokemonSpeciesId(englishName: string): string | null {
  const identity = parseExternalPokemonIdentity(englishName);
  if (!identity.original || identity.unknownFormLabel) return null;

  const candidate = [
    identity.baseSlug,
    identity.regionalSuffix,
    identity.knownFormSuffix,
    identity.isMega ? 'mega' : undefined,
    identity.isShadow ? 'shadow' : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join('_');
  return getPokemonNameJa(candidate) ? candidate : null;
}

/**
 * Leek Duckの英語名を、既存のspeciesId辞書に実在するフォームだけ照合して
 * 日本語化します。内部IDを作り替えたり、未知フォームを推測したりしません。
 */
export function localizeExternalPokemonName(englishName: string): string {
  const identity = parseExternalPokemonIdentity(englishName);
  const { original } = identity;
  if (!original) return '名称不明';
  const {
    baseSlug,
    regionalSuffix,
    knownFormSuffix,
    unknownFormLabel,
    isMega,
    isShadow,
  } = identity;
  if (unknownFormLabel) {
    const knownBase = getPokemonNameJa(
      [baseSlug, regionalSuffix, isMega ? 'mega' : undefined]
        .filter((value): value is string => Boolean(value))
        .join('_'),
    );
    if (knownBase) {
      return `${knownBase}（${unknownFormLabel}）${isShadow ? '（シャドウ）' : ''}`;
    }
  }
  const suffixes = [
    regionalSuffix,
    knownFormSuffix,
    isMega ? 'mega' : undefined,
    isShadow ? 'shadow' : undefined,
  ].filter((value): value is string => Boolean(value));
  const speciesId = [baseSlug, ...suffixes].join('_');
  const resolved = getPokemonNameJa(speciesId);
  if (resolved) return resolved;

  const baseResolved = getPokemonNameJa(
    [baseSlug, regionalSuffix, knownFormSuffix, isMega ? 'mega' : undefined]
      .filter((value): value is string => Boolean(value))
      .join('_'),
  );
  if (baseResolved && isShadow) return `${baseResolved}（シャドウ）`;

  // 通常名や既存辞書に登録された完全な英語フォーム名を最後に再利用する。
  return replacePokemonNamesInText(original);
}

export function stripExternalMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|apos|#39|quot|lt|gt|nbsp);/g, (entity) =>
      HTML_ENTITIES[entity] ?? entity,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function localizeResearchObject(value: string): string {
  const normalized = value.trim();
  if (/^Pok[eé]mon$/i.test(normalized)) return 'ポケモン';
  if (/^different species of Pok[eé]mon$/i.test(normalized)) {
    return '種類が異なるポケモン';
  }
  if (/^Pok[eé]mon with Weather Boost$/i.test(normalized)) {
    return '天候ブースト中のポケモン';
  }

  const typeMatch = /^(.+)-type Pok[eé]mon$/i.exec(normalized);
  if (typeMatch?.[1]) {
    return `${getTypeLabelJa(typeMatch[1])}タイプのポケモン`;
  }

  return localizeExternalPokemonName(normalized);
}

/** 現行データで確認できた定型タスクのみ翻訳し、未知文は英語へ戻します。 */
export function localizeResearchText(value: string): string {
  const text = stripExternalMarkup(value);
  if (!text) return 'タスク内容不明';

  const catchMatch = /^Catch (\d+) (.+?)( while in a Party)?$/i.exec(text);
  if (catchMatch?.[1] && catchMatch[2]) {
    const party = catchMatch[3] ? '（パーティープレイ中）' : '';
    return `${localizeResearchObject(catchMatch[2])}を${catchMatch[1]}匹つかまえる${party}`;
  }

  const throwMatch = /^Make (\d+) (Nice|Great|Excellent) Throws?( in a row)?$/i.exec(text);
  if (throwMatch?.[1] && throwMatch[2]) {
    const quality = { Nice: 'ナイス', Great: 'グレート', Excellent: 'エクセレント' }[
      throwMatch[2] as 'Nice' | 'Great' | 'Excellent'
    ];
    return `${quality}スローを${throwMatch[1]}回${throwMatch[3] ? '連続で' : ''}投げる`;
  }

  const exploreMatch = /^Explore (\d+(?:\.\d+)?) km$/i.exec(text);
  if (exploreMatch?.[1]) return `${exploreMatch[1]} km探索する`;

  const walkMatch = /^Walk (\d+(?:\.\d+)?) km$/i.exec(text);
  if (walkMatch?.[1]) return `${walkMatch[1]} km歩く`;

  if (/^Defeat a Team GO Rocket Grunt$/i.test(text)) {
    return 'GOロケット団のしたっぱに1回勝つ';
  }

  return replacePokemonNamesInText(text);
}

export function getTypeLabelJa(type: string): string {
  return getTypeLabelFromMeta(type);
}

export function getRaidTierLabel(tier: string): string {
  const normalized = tier.trim().toLowerCase();
  if (normalized === '1-star raids' || normalized === 'tier 1') return '★1';
  if (normalized === '3-star raids' || normalized === 'tier 3') return '★3';
  if (normalized === '5-star raids' || normalized === 'tier 5') return '伝説 / ★5';
  if (normalized === 'mega raids' || normalized === 'mega') return 'メガ';
  return tier || 'その他';
}

export function getResearchTypeLabel(type: string | null): string {
  if (!type) return '分類なし';
  const labels: Readonly<Record<string, string>> = {
    event: 'イベント限定',
    catch: '捕獲',
    throw: 'スロー',
    battle: 'バトル',
    explore: '探索',
    training: '強化・進化',
    rocket: 'GOロケット団',
    buddy: '相棒',
    ar: 'AR',
    sponsored: 'スポンサー',
  };
  return labels[type.toLowerCase()] ?? type;
}

export function getRocketTitleLabel(title: string): string {
  const labels: Readonly<Record<string, string>> = {
    'Team GO Rocket Boss': 'サカキ',
    'Team GO Rocket Leader': 'GOロケット団リーダー',
    'Team GO Rocket Grunt': 'GOロケット団のしたっぱ',
  };
  return labels[title] ?? title;
}

export function getRocketTrainerName(name: string, type: string | null): string {
  const names: Readonly<Record<string, string>> = {
    Giovanni: 'サカキ',
    Cliff: 'クリフ',
    Arlo: 'アルロ',
    Sierra: 'シエラ',
    'Male Grunt': 'したっぱ（男性）',
    'Female Grunt': 'したっぱ（女性）',
    'Decoy Female Grunt': 'おとりのしたっぱ',
  };
  if (names[name]) return names[name];

  const typedGrunt = /^.+-type (Male|Female) Grunt$/i.exec(name);
  if (typedGrunt && type) {
    return `${getTypeLabelJa(type)}タイプのしたっぱ（${typedGrunt[1]?.toLowerCase() === 'male' ? '男性' : '女性'}）`;
  }
  return name;
}
