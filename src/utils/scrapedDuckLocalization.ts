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
    return '天候ブーストを受けているポケモン';
  }

  const typeMatch = /^(.+)-type Pok[eé]mon$/i.exec(normalized);
  if (typeMatch?.[1]) {
    return `${getTypeLabelJa(typeMatch[1])}タイプのポケモン`;
  }

  return localizeExternalPokemonName(normalized);
}

/** PokeMinersの同一quest localization keyで確認できた定型だけを日本語化します。 */
export function localizeResearchText(value: string): string {
  const text = stripExternalMarkup(value);
  if (!text) return 'タスク内容不明';

  const differentSpeciesMatch = /^Catch (\d+) different species of Pok[eé]mon$/i.exec(text);
  if (differentSpeciesMatch?.[1]) {
    // quest_catch_plural_unique
    return `ポケモンを${differentSpeciesMatch[1]}種類捕まえる`;
  }

  const catchMatch = /^Catch (\d+) (.+?)( while in a Party)?$/i.exec(text);
  if (catchMatch?.[1] && catchMatch[2]) {
    const party = catchMatch[3] ? '（パーティープレイ中）' : '';
    return `${localizeResearchObject(catchMatch[2])}を${catchMatch[1]}匹捕まえる${party}`;
  }

  const catchSingularMatch = /^Catch (?:a|an) (.+?)( while in a Party)?$/i.exec(text);
  if (catchSingularMatch?.[1]) {
    const party = catchSingularMatch[2] ? '（パーティープレイ中）' : '';
    return `${localizeResearchObject(catchSingularMatch[1])}を1匹捕まえる${party}`;
  }

  const throwMatch = /^Make (\d+) (?:(Nice|Great|Excellent) )?(Curveball )?Throws?( in a row)?$/i.exec(text);
  if (throwMatch?.[1]) {
    const qualityKey = throwMatch[2]?.toLowerCase() as 'nice' | 'great' | 'excellent' | undefined;
    const quality = qualityKey ? {
      nice: 'ナイス',
      great: 'グレート',
      excellent: 'エクセレント',
    }[qualityKey] : '';
    const throwName = throwMatch[3]
      ? quality ? `カーブボールの${quality}スロー` : 'カーブボール'
      : `${quality}スロー`;
    return `${throwName}を${throwMatch[1]}回${throwMatch[4] ? '連続で' : ''}投げる`;
  }

  const exploreMatch = /^Explore (\d+(?:\.\d+)?) km$/i.exec(text);
  if (exploreMatch?.[1]) return `${exploreMatch[1]}km 探索する`;

  const walkMatch = /^Walk (\d+(?:\.\d+)?) km$/i.exec(text);
  if (walkMatch?.[1]) return `${walkMatch[1]}km歩く`;

  const spinMatch = /^Spin (\d+) Pok[eé]Stops or Gyms$/i.exec(text);
  if (spinMatch?.[1]) return `ポケストップ・ジム${spinMatch[1]}個を回す`;

  if (/^Win a three-star raid or higher$/i.test(text)) {
    return 'レベル3以上のレイドに1回勝つ';
  }
  if (/^Win a raid$/i.test(text)) return 'レイドバトルで1回勝つ';
  const winRaidsMatch = /^Win (\d+) raids$/i.exec(text);
  if (winRaidsMatch?.[1]) return `レイドバトルで${winRaidsMatch[1]}回勝つ`;

  if (/^Hatch (?:an|a) Egg$/i.test(text)) return 'タマゴを1個かえす';
  const hatchMatch = /^Hatch (\d+) Eggs$/i.exec(text);
  if (hatchMatch?.[1]) return `タマゴを${hatchMatch[1]}個かえす`;

  if (/^Take a snapshot of a wild Pok[eé]mon$/i.test(text)) {
    return '野生ポケモンのGOスナップショット写真を撮る';
  }
  if (/^Evolve a Pok[eé]mon$/i.test(text)) return 'ポケモンを1匹進化させる';

  const powerUpMatch = /^Power up Pok[eé]mon (\d+) times$/i.exec(text);
  if (powerUpMatch?.[1]) return `ポケモンを${powerUpMatch[1]}回強化する`;

  const buddyCandyMatch = /^Earn (\d+) Candies walking with your buddy$/i.exec(text);
  if (buddyCandyMatch?.[1]) return `相棒と歩いてアメを${buddyCandyMatch[1]}個もらう`;

  const giftStickerMatch = /^Send (\d+) Gifts and add a sticker to each$/i.exec(text);
  if (giftStickerMatch?.[1]) return `ステッカー付きのギフトを${giftStickerMatch[1]}個贈る`;

  if (/^Trade a Pok[eé]mon$/i.test(text)) return 'ポケモンを交換する';

  if (/^Defeat a Team GO Rocket Grunt$/i.test(text)) {
    return 'GOロケット団したっぱとのバトルで1回勝つ';
  }

  return replacePokemonNamesInText(text);
}

export function isLikelyUntranslatedResearchText(value: string): boolean {
  const localized = localizeResearchText(value)
    .replace(/Pok[eé]mon GO Plus \+|Pok[eé]mon GO|GOロケット団|GOスナップショット|km|CP|AR/gi, ' ');
  const englishWords = localized.match(/\b[A-Za-z][A-Za-z'’-]{2,}\b/g) ?? [];
  return englishWords.length >= 2;
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
