import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PVPoke_SOURCE_URL =
  'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
const POKEAPI_CSV_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const POKEAPI_SOURCE_URLS = {
  speciesNames: `${POKEAPI_CSV_BASE_URL}/pokemon_species_names.csv`,
  pokemon: `${POKEAPI_CSV_BASE_URL}/pokemon.csv`,
  forms: `${POKEAPI_CSV_BASE_URL}/pokemon_forms.csv`,
  formNames: `${POKEAPI_CSV_BASE_URL}/pokemon_form_names.csv`,
};

const OUTPUT_PATH = resolve('public/data/pokemon.json');
const NAMES_OUTPUT_PATH = resolve('src/data/pokemonNamesJa.json');
const JAPANESE_LANGUAGE_IDS = ['1', '11'];
const ENGLISH_LANGUAGE_ID = '9';

/**
 * PvPokeとPokeAPIで識別子が異なる、実データで確認済みのフォームだけを対応付ける。
 * 大半のフォームはデータ同士の識別子・英語フォーム名から自動的に対応できる。
 */
const POKEAPI_FORM_IDENTIFIER_BY_PVPOKE_ID = {
  meowstic: 'meowstic-male',
  tauros_aqua: 'tauros-paldea-aqua-breed',
  tauros_blaze: 'tauros-paldea-blaze-breed',
  tauros_combat: 'tauros-paldea-combat-breed',
  zygarde: 'zygarde-50',
};

/**
 * PokeAPIに日本語で区別できるフォーム名がない、公式表記確認済みの少数フォーム。
 * ピカチュウ衣装は pokemongo.com/ja の各イベント告知で表記を確認している。
 */
const PVPOKE_DISPLAY_NAME_OVERRIDES_JA = {
  mewtwo_armored: 'アーマードミュウツー',
  pikachu_5th_anniversary:
    '「5」の形をした風船をつけた「そらをとぶピカチュウ」',
  pikachu_flying: 'そらをとぶピカチュウ',
  pikachu_horizons: 'キャプテン帽子をかぶったピカチュウ',
  pikachu_kariyushi: '「かりゆしウェア」を身にまとったピカチュウ',
  pikachu_shaymin: '「シェイミ」風スカーフを身につけたピカチュウ',
  tauros_aqua: 'ケンタロス（パルデアのすがた・ウォーターしゅ）',
  tauros_blaze: 'ケンタロス（パルデアのすがた・ブレイズしゅ）',
  tauros_combat: 'ケンタロス（パルデアのすがた・コンバットしゅ）',
};

/** PvPokeの英語名に括弧があるものの、PokeAPI上は独立した種族であるID。 */
const PVPOKE_IDS_WITHOUT_FORM = new Set(['mime_jr']);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveStat(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function compactPokemon(value) {
  if (!isRecord(value) || value.released === false) return null;

  const speciesId =
    typeof value.speciesId === 'string' ? value.speciesId.trim() : '';
  const speciesName =
    typeof value.speciesName === 'string' ? value.speciesName.trim() : '';
  if (!speciesId || !speciesName || !isRecord(value.baseStats)) return null;

  const atk = positiveStat(value.baseStats.atk);
  const def = positiveStat(value.baseStats.def);
  const hp = positiveStat(value.baseStats.hp);
  if (atk === null || def === null || hp === null) return null;

  const dex =
    typeof value.dex === 'number' && Number.isFinite(value.dex) && value.dex >= 0
      ? Math.trunc(value.dex)
      : 0;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag) => typeof tag === 'string')
    : [];

  return {
    dex,
    speciesName,
    speciesId,
    baseStats: { atk, def, hp },
    released: true,
    ...(tags.length > 0 ? { tags } : {}),
  };
}

function extractPokemon(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.pokemon)) return [];

  const unique = new Map();
  for (const value of payload.pokemon) {
    const pokemon = compactPokemon(value);
    if (pokemon && !unique.has(pokemon.speciesId)) {
      unique.set(pokemon.speciesId, pokemon);
    }
  }

  return [...unique.values()].sort(
    (left, right) =>
      left.dex - right.dex ||
      left.speciesName.localeCompare(right.speciesName, 'en'),
  );
}

/** RFC 4180の引用符と改行に対応する、依存ライブラリ不要のCSVパーサー。 */
function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers || headers.length === 0) return [];

  return rows
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? '']),
      ),
    );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status}): ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status}): ${url}`);
  }
  return response.json();
}

function preferLocalizedValue(rows, fieldName, languageIds) {
  for (const languageId of languageIds) {
    const row = rows.find(
      (entry) =>
        entry.local_language_id === languageId &&
        typeof entry[fieldName] === 'string' &&
        entry[fieldName].trim(),
    );
    if (row) return row[fieldName].trim();
  }
  return '';
}

function createPokeApiLocalization(csvSources) {
  const speciesNameRows = parseCsv(csvSources.speciesNames);
  const pokemonRows = parseCsv(csvSources.pokemon);
  const formRows = parseCsv(csvSources.forms);
  const formNameRows = parseCsv(csvSources.formNames);

  const speciesNamesById = new Map();
  for (const row of speciesNameRows) {
    const entries = speciesNamesById.get(row.pokemon_species_id) ?? [];
    entries.push(row);
    speciesNamesById.set(row.pokemon_species_id, entries);
  }

  const speciesJaByDex = new Map();
  for (const [speciesId, rows] of speciesNamesById) {
    const name = preferLocalizedValue(rows, 'name', JAPANESE_LANGUAGE_IDS);
    if (name) speciesJaByDex.set(Number(speciesId), name);
  }

  const pokemonById = new Map(pokemonRows.map((row) => [row.id, row]));
  const formNamesById = new Map();
  for (const row of formNameRows) {
    const entries = formNamesById.get(row.pokemon_form_id) ?? [];
    entries.push(row);
    formNamesById.set(row.pokemon_form_id, entries);
  }

  const formsByDex = new Map();
  const formsByIdentifier = new Map();
  for (const form of formRows) {
    const pokemon = pokemonById.get(form.pokemon_id);
    if (!pokemon) continue;

    const names = formNamesById.get(form.id) ?? [];
    const candidate = {
      identifier: form.identifier,
      formIdentifier: form.form_identifier,
      jaFormName: preferLocalizedValue(
        names,
        'form_name',
        JAPANESE_LANGUAGE_IDS,
      ),
      jaPokemonName: preferLocalizedValue(
        names,
        'pokemon_name',
        JAPANESE_LANGUAGE_IDS,
      ),
      enFormName: preferLocalizedValue(
        names,
        'form_name',
        [ENGLISH_LANGUAGE_ID],
      ),
      enPokemonName: preferLocalizedValue(
        names,
        'pokemon_name',
        [ENGLISH_LANGUAGE_ID],
      ),
    };

    const dex = Number(pokemon.species_id);
    const entries = formsByDex.get(dex) ?? [];
    entries.push(candidate);
    formsByDex.set(dex, entries);
    formsByIdentifier.set(form.identifier, candidate);
  }

  return { speciesJaByDex, formsByDex, formsByIdentifier };
}

function extractEnglishForms(speciesName) {
  return [...speciesName.matchAll(/\(([^()]+)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((name) => name && name.toLowerCase() !== 'shadow');
}

function isShadowPokemon(pokemon) {
  return (
    pokemon.speciesId.endsWith('_shadow') ||
    pokemon.tags?.includes('shadow') ||
    /\(shadow\)\s*$/i.test(pokemon.speciesName)
  );
}

function toPokeApiIdentifier(speciesId) {
  return speciesId
    .replace(/_shadow$/, '')
    .replaceAll('_', '-')
    .replace(/-alolan(?=-|$)/g, '-alola')
    .replace(/-galarian(?=-|$)/g, '-galar')
    .replace(/-hisuian(?=-|$)/g, '-hisui')
    .replace(/-paldean(?=-|$)/g, '-paldea');
}

function normalizeFormText(value) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll('alolan', 'alola')
    .replaceAll('galarian', 'galar')
    .replaceAll('hisuian', 'hisui')
    .replaceAll('paldean', 'paldea')
    .replaceAll('forme', 'form')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(?:form|breed)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPokeApiForm(pokemon, englishForms, localization) {
  if (englishForms.length === 0) return null;

  const bareSpeciesId = pokemon.speciesId.replace(/_shadow$/, '');
  const explicitIdentifier = POKEAPI_FORM_IDENTIFIER_BY_PVPOKE_ID[bareSpeciesId];
  const directIdentifier = explicitIdentifier ?? toPokeApiIdentifier(bareSpeciesId);
  const direct = localization.formsByIdentifier.get(directIdentifier);
  if (direct) return direct;

  const formKey = normalizeFormText(englishForms.join(' '));
  if (!formKey) return null;
  const formTokens = new Set(formKey.split(' '));
  const candidates = localization.formsByDex.get(pokemon.dex) ?? [];

  let bestCandidate = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candidateTexts = [
      candidate.formIdentifier,
      candidate.enFormName,
      candidate.enPokemonName,
    ]
      .map(normalizeFormText)
      .filter(Boolean);
    let score = 0;

    for (const candidateText of candidateTexts) {
      if (candidateText === formKey) {
        score = Math.max(score, 100);
        continue;
      }
      const candidateTokens = new Set(candidateText.split(' '));
      const matchedTokens = [...formTokens].filter((token) =>
        candidateTokens.has(token),
      ).length;
      if (matchedTokens === formTokens.size) {
        score = Math.max(score, 60 + matchedTokens);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= 60 ? bestCandidate : null;
}

function appendShadow(name, shadow) {
  return shadow ? `${name}（シャドウ）` : name;
}

function localizePokemon(pokemon, localization) {
  const shadow = isShadowPokemon(pokemon);
  const bareSpeciesId = pokemon.speciesId.replace(/_shadow$/, '');
  const override = PVPOKE_DISPLAY_NAME_OVERRIDES_JA[bareSpeciesId];
  if (override) {
    return {
      displayNameJa: appendShadow(override, shadow),
      source: 'override',
    };
  }

  const baseNameJa = localization.speciesJaByDex.get(pokemon.dex);
  if (!baseNameJa) {
    const englishName = pokemon.speciesName.replace(
      /\s*\(Shadow\)\s*$/i,
      '',
    );
    return {
      displayNameJa: appendShadow(englishName, shadow),
      source: 'english-fallback',
    };
  }

  const englishForms = PVPOKE_IDS_WITHOUT_FORM.has(bareSpeciesId)
    ? []
    : extractEnglishForms(pokemon.speciesName);
  if (englishForms.length === 0) {
    return {
      displayNameJa: appendShadow(baseNameJa, shadow),
      source: 'pokeapi-species',
    };
  }

  const pokeApiForm = findPokeApiForm(pokemon, englishForms, localization);
  const formNameJa = pokeApiForm?.jaPokemonName || pokeApiForm?.jaFormName;
  if (formNameJa) {
    const localizedName = formNameJa.includes(baseNameJa)
      ? formNameJa
      : `${baseNameJa}（${formNameJa}）`;
    return {
      displayNameJa: appendShadow(localizedName, shadow),
      source: 'pokeapi-form',
    };
  }

  return {
    displayNameJa: appendShadow(
      `${baseNameJa}（${englishForms.join(' / ')}）`,
      shadow,
    ),
    source: 'english-form-fallback',
  };
}

function sortedObject(
  entries,
  compare = ([left], [right]) => left.localeCompare(right, 'en'),
) {
  return Object.fromEntries([...entries].sort(compare));
}

function addJapaneseNames(pokemon, localization) {
  const counts = {
    pokeApiSpecies: 0,
    pokeApiForm: 0,
    override: 0,
    englishFormFallback: 0,
    englishFallback: 0,
  };
  const localizedPokemon = pokemon.map((entry) => {
    const result = localizePokemon(entry, localization);
    const countKey = {
      'pokeapi-species': 'pokeApiSpecies',
      'pokeapi-form': 'pokeApiForm',
      override: 'override',
      'english-form-fallback': 'englishFormFallback',
      'english-fallback': 'englishFallback',
    }[result.source];
    counts[countKey] += 1;
    return { ...entry, displayNameJa: result.displayNameJa };
  });

  const byDex = sortedObject(
    localization.speciesJaByDex.entries(),
    ([left], [right]) => Number(left) - Number(right),
  );
  const bySpeciesId = sortedObject(
    localizedPokemon.map((entry) => [entry.speciesId, entry.displayNameJa]),
  );
  const englishToJapaneseMap = new Map();
  for (const entry of localizedPokemon) {
    if (!englishToJapaneseMap.has(entry.speciesName)) {
      englishToJapaneseMap.set(entry.speciesName, entry.displayNameJa);
    }
  }
  const englishToJapanese = sortedObject(englishToJapaneseMap.entries());

  return {
    pokemon: localizedPokemon,
    names: { byDex, bySpeciesId, englishToJapanese },
    counts,
  };
}

async function existingDataIsUsable() {
  try {
    const [payload, names] = await Promise.all([
      readFile(OUTPUT_PATH, 'utf8').then(JSON.parse),
      readFile(NAMES_OUTPUT_PATH, 'utf8').then(JSON.parse),
    ]);
    return (
      isRecord(payload) &&
      Array.isArray(payload.pokemon) &&
      payload.pokemon.length > 0 &&
      payload.pokemon.every(
        (entry) => isRecord(entry) && typeof entry.displayNameJa === 'string',
      ) &&
      isRecord(names) &&
      isRecord(names.byDex) &&
      isRecord(names.bySpeciesId) &&
      isRecord(names.englishToJapanese) &&
      Object.keys(names.byDex).length >= 1000 &&
      Object.keys(names.bySpeciesId).length === payload.pokemon.length &&
      Object.keys(names.englishToJapanese).length >= 1000
    );
  } catch {
    return false;
  }
}

async function generate() {
  const [gameMaster, speciesNames, pokemonCsv, forms, formNames] =
    await Promise.all([
      fetchJson(PVPoke_SOURCE_URL),
      fetchText(POKEAPI_SOURCE_URLS.speciesNames),
      fetchText(POKEAPI_SOURCE_URLS.pokemon),
      fetchText(POKEAPI_SOURCE_URLS.forms),
      fetchText(POKEAPI_SOURCE_URLS.formNames),
    ]);

  const pokemon = extractPokemon(gameMaster);
  if (pokemon.length === 0) {
    throw new Error('PvPoke Game Master contained no usable Pokémon data.');
  }

  const localization = createPokeApiLocalization({
    speciesNames,
    pokemon: pokemonCsv,
    forms,
    formNames,
  });
  if (
    localization.speciesJaByDex.size < 1000 ||
    localization.formsByIdentifier.size < 1000
  ) {
    throw new Error(
      'PokeAPI CSV data was incomplete or its expected columns changed.',
    );
  }

  const localized = addJapaneseNames(pokemon, localization);
  const localizedNameCount =
    localized.counts.pokeApiSpecies +
    localized.counts.pokeApiForm +
    localized.counts.override;
  if (
    localized.pokemon.length !== pokemon.length ||
    localizedNameCount < Math.floor(pokemon.length * 0.98) ||
    Object.keys(localized.names.bySpeciesId).length !== pokemon.length ||
    Object.keys(localized.names.englishToJapanese).length < 1000
  ) {
    throw new Error(
      'Generated Japanese name coverage was unexpectedly incomplete.',
    );
  }

  const generatedAt = new Date().toISOString();
  const sources = {
    pvpoke: PVPoke_SOURCE_URL,
    pokeApi: POKEAPI_SOURCE_URLS,
  };
  const output = {
    sources,
    generatedAt,
    localization: localized.counts,
    pokemon: localized.pokemon,
  };
  const namesOutput = {
    sources,
    generatedAt,
    ...localized.names,
  };

  await Promise.all([
    mkdir(dirname(OUTPUT_PATH), { recursive: true }),
    mkdir(dirname(NAMES_OUTPUT_PATH), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8'),
    writeFile(NAMES_OUTPUT_PATH, `${JSON.stringify(namesOutput)}\n`, 'utf8'),
  ]);

  console.log(`Generated ${localized.pokemon.length} Pokémon records.`);
  console.log(
    `Japanese names: ${localized.counts.pokeApiSpecies} species, ` +
      `${localized.counts.pokeApiForm} forms, ` +
      `${localized.counts.override} overrides, ` +
      `${localized.counts.englishFormFallback} English form fallbacks, ` +
      `${localized.counts.englishFallback} full English fallbacks.`,
  );
}

try {
  await generate();
} catch (error) {
  if (await existingDataIsUsable()) {
    console.warn(
      'Pokémon data refresh failed; keeping the committed localized compact data.',
    );
  } else {
    throw error;
  }
}
