import pokemonNamesJaJson from '../data/pokemonNamesJa.json';

interface PokemonNamesJaData {
  byDex: Record<string, string>;
  bySpeciesId: Record<string, string>;
  englishToJapanese: Record<string, string>;
}

export interface PokemonNameReplacement {
  englishName: string;
  japaneseName: string;
}

const pokemonNamesJa = pokemonNamesJaJson as PokemonNamesJaData;

/** 内部IDを変えず、生成済みの日本語表示名だけを取得します。 */
export function getPokemonNameJa(
  speciesId: string,
  dex?: number,
): string | undefined {
  const nameBySpeciesId = pokemonNamesJa.bySpeciesId[speciesId];
  if (nameBySpeciesId) return nameBySpeciesId;

  if (dex !== undefined) {
    const nameByDex = pokemonNamesJa.byDex[String(dex)];
    if (nameByDex) return nameByDex;
  }

  return undefined;
}

/**
 * 埋め込み名、静的辞書、英語名の順で安全にフォールバックします。
 * 外部データの欠損で選択UI全体が表示不能にならないための境界です。
 */
export function getPokemonDisplayName(options: {
  speciesId: string;
  speciesName: string;
  dex?: number;
  embeddedJapaneseName?: string;
}): string {
  return (
    options.embeddedJapaneseName?.trim() ||
    getPokemonNameJa(options.speciesId, options.dex) ||
    options.speciesName
  );
}

let replacementsCache: readonly PokemonNameReplacement[] | undefined;

/** イベントタイトル等で再利用する、長い英語名優先の読み取り専用辞書です。 */
export function getPokemonNameReplacements(): readonly PokemonNameReplacement[] {
  if (!replacementsCache) {
    replacementsCache = Object.entries(pokemonNamesJa.englishToJapanese)
      .map(([englishName, japaneseName]) => ({ englishName, japaneseName }))
      .sort(
        (left, right) =>
          right.englishName.length - left.englishName.length ||
          left.englishName.localeCompare(right.englishName, 'en'),
      );
  }
  return replacementsCache;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let pokemonNameMatcher: RegExp | undefined;
let japaneseNameByEnglishLowercase: ReadonlyMap<string, string> | undefined;

function prepareTextReplacement(): {
  matcher: RegExp;
  names: ReadonlyMap<string, string>;
} {
  if (!pokemonNameMatcher || !japaneseNameByEnglishLowercase) {
    const replacements = getPokemonNameReplacements();
    japaneseNameByEnglishLowercase = new Map(
      replacements.map(({ englishName, japaneseName }) => [
        englishName.toLocaleLowerCase('en-US'),
        japaneseName,
      ]),
    );
    const alternatives = replacements
      .map(({ englishName }) => escapeRegExp(englishName))
      .join('|');
    // 前後の英数字を境界として扱い、短い名前の部分一致を防ぐ。
    pokemonNameMatcher = new RegExp(
      `(^|[^A-Za-z0-9])(${alternatives})(?=$|[^A-Za-z0-9])`,
      'giu',
    );
  }

  return {
    matcher: pokemonNameMatcher,
    names: japaneseNameByEnglishLowercase,
  };
}

/** 英語タイトル内のPokémon名だけを、日本語の静的辞書で置換します。 */
export function replacePokemonNamesInText(text: string): string {
  if (!text) return text;

  const { matcher, names } = prepareTextReplacement();
  matcher.lastIndex = 0;
  return text.replace(
    matcher,
    (matched, prefix: string, englishName: string) =>
      `${prefix}${
        names.get(englishName.toLocaleLowerCase('en-US')) ??
        matched.slice(prefix.length)
      }`,
  );
}
