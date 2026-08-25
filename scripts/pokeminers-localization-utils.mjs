export function parsePokeMinersLocalization(value) {
  const entries = new Map();
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  let key = null;
  let textLines = [];

  const commit = () => {
    if (!key) return;
    const text = textLines.join('\n').trim();
    if (text) entries.set(key, text);
  };

  for (const line of lines) {
    if (line.startsWith('RESOURCE ID:')) {
      commit();
      key = line.slice('RESOURCE ID:'.length).trim();
      textLines = [];
      continue;
    }
    if (!key) continue;
    if (line.startsWith('TEXT:')) {
      textLines.push(line.slice('TEXT:'.length).trimStart());
      continue;
    }
    if (textLines.length > 0) textLines.push(line);
  }
  commit();
  return entries;
}

export function normalizeLocalizationText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[^\p{L}\p{N}%{}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

export function createLocalizedTextIndex(englishEntries, japaneseEntries) {
  const index = new Map();
  for (const [key, english] of englishEntries) {
    const japanese = japaneseEntries.get(key)?.trim();
    if (!japanese) continue;
    const normalizedEnglish = normalizeLocalizationText(english);
    const matches = index.get(normalizedEnglish) ?? [];
    matches.push({ localizationKey: key, english, japanese });
    index.set(normalizedEnglish, matches);
  }
  return index;
}

export function resolveLocalizedText(value, indexes) {
  const normalized = normalizeLocalizationText(value);
  const candidates = indexes.flatMap((index) => index.get(normalized) ?? []);
  const unique = new Map(candidates.map((candidate) => [
    `${candidate.localizationKey}\u0000${candidate.japanese}`,
    candidate,
  ]));
  if (unique.size !== 1) return null;
  return [...unique.values()][0] ?? null;
}

export function isLikelyEnglishSentence(value) {
  const text = String(value ?? '').replace(/Pok[eé]mon|Team GO Rocket|GO/gi, ' ');
  const words = text.match(/\b[A-Za-z][A-Za-z'’-]{2,}\b/g) ?? [];
  return words.length >= 3;
}

export function createLocalizationCatalog(sources) {
  const byKey = new Map();
  for (const source of sources) {
    for (const [localizationKey, english] of source.englishEntries) {
      if (byKey.has(localizationKey)) continue;
      const japanese = source.japaneseEntries.get(localizationKey)?.trim();
      if (!japanese) continue;
      byKey.set(localizationKey, {
        localizationKey,
        english: english.trim(),
        japanese,
        source: source.name,
      });
    }
  }

  const byEnglish = new Map();
  for (const entry of byKey.values()) {
    const normalized = normalizeLocalizationText(entry.english);
    const matches = byEnglish.get(normalized) ?? [];
    matches.push(entry);
    byEnglish.set(normalized, matches);
  }
  return { byKey, byEnglish };
}

function rocketKeyMatcher(entry) {
  const leaderSlugs = {
    Giovanni: 'giovanni',
    Cliff: 'cliff',
    Arlo: 'arlo',
    Sierra: 'sierra',
  };
  const leaderSlug = leaderSlugs[entry.trainerName];
  if (leaderSlug) {
    return (key) => new RegExp(`^combat_${leaderSlug}_quote(?:#\\d+|__(?:male|female)_speaker)$`).test(key);
  }

  if (entry.trainerName === 'Decoy Female Grunt') {
    return (key) => /^combat_grunt_decoy_quote#\d+$/.test(key);
  }

  const gender = /\bFemale\b/.test(entry.trainerName)
    ? 'female'
    : /\bMale\b/.test(entry.trainerName)
      ? 'male'
      : null;
  if (!gender) return () => false;

  if (entry.type) {
    const expectedKey = `combat_grunt_quote_${entry.type}__${gender}_speaker`;
    return (key) => key === expectedKey;
  }
  return (key) => new RegExp(`^combat_grunt_quote#\\d+__${gender}_speaker$`).test(key);
}

function dedupeLocalizations(entries) {
  const byJapanese = new Map();
  for (const entry of entries) {
    const japanese = String(entry.japanese).replace(/\r\n?/g, '\n').trim();
    const normalized = japanese.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (japanese && !byJapanese.has(normalized)) {
      byJapanese.set(normalized, { ...entry, japanese });
    }
  }
  return [...byJapanese.values()];
}

export function localizeRocketDialogueEntries(entries, catalog) {
  return entries.map((entry) => {
    const matchesKey = rocketKeyMatcher(entry);
    const hasEnglishAnchor = entry.dialogues.some((dialogue) =>
      (catalog.byEnglish.get(normalizeLocalizationText(dialogue)) ?? [])
        .some((candidate) => matchesKey(candidate.localizationKey)),
    );
    if (!hasEnglishAnchor) {
      return { ...entry, dialogues: [], localizations: [], unresolvedDialogues: [...entry.dialogues] };
    }

    const localizations = dedupeLocalizations(
      [...catalog.byKey.values()]
        .filter((candidate) => matchesKey(candidate.localizationKey))
        .sort((left, right) => left.localizationKey.localeCompare(right.localizationKey, 'en', { numeric: true })),
    );
    return {
      ...entry,
      dialogues: localizations.map((localization) => localization.japanese),
      localizations,
      unresolvedDialogues: [],
    };
  });
}
