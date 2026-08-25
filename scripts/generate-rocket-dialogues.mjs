import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  extractLeekDuckEntries,
  extractSerebiiMixedDialogues,
  mergeMixedGruntDialogues,
} from './rocket-dialogue-utils.mjs';
import {
  createLocalizationCatalog,
  isLikelyEnglishSentence,
  localizeRocketDialogueEntries,
  parsePokeMinersLocalization,
} from './pokeminers-localization-utils.mjs';

const LEEK_DUCK_URL = 'https://leekduck.com/rocket-lineups/';
const SEREBII_URL = 'https://www.serebii.net/pokemongo/teamgorocket.shtml';
const POKEMINERS_URLS = {
  remoteEnglish: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/English.txt',
  remoteJapanese: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/Japanese.txt',
  apkEnglish: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/English.txt',
  apkJapanese: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/Japanese.txt',
};
const OUTPUT_PATH = resolve('public/data/rocket-dialogues.json');
const MIN_TRAINERS = 24;
const EXPECTED_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy',
];
const REQUIRED_TRAINERS = [
  'Giovanni', 'Cliff', 'Arlo', 'Sierra', 'Male Grunt', 'Female Grunt',
  'Decoy Female Grunt',
];

async function fetchText(url, accept = 'text/plain') {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'GO-Scope-rocket-dialogue-generator',
    },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

function validateEntries(entries) {
  if (entries.length < MIN_TRAINERS) {
    throw new Error(`Only ${entries.length} Rocket dialogue profiles were extracted.`);
  }

  const identities = new Set(entries.map((entry) => entry.identity));
  if (identities.size !== entries.length) throw new Error('Duplicate Rocket dialogue identities detected.');

  const types = new Set(entries.map((entry) => entry.type).filter(Boolean));
  const missingTypes = EXPECTED_TYPES.filter((type) => !types.has(type));
  if (missingTypes.length > 0) {
    throw new Error(`Missing typed grunt dialogues: ${missingTypes.join(', ')}`);
  }

  const trainerNames = new Set(entries.map((entry) => entry.trainerName));
  const missingTrainers = REQUIRED_TRAINERS.filter((name) => !trainerNames.has(name));
  if (missingTrainers.length > 0) {
    throw new Error(`Missing required Rocket trainers: ${missingTrainers.join(', ')}`);
  }

  for (const name of ['Male Grunt', 'Female Grunt']) {
    const entry = entries.find((candidate) => candidate.trainerName === name);
    if (!entry || entry.dialogues.length < 3) {
      throw new Error(`${name} did not retain all mixed grunt dialogues.`);
    }
  }

  const expectedMultipleCounts = {
    'Decoy Female Grunt': 10,
    Giovanni: 5,
    Cliff: 5,
    Arlo: 5,
    Sierra: 5,
  };
  for (const [name, minimum] of Object.entries(expectedMultipleCounts)) {
    const entry = entries.find((candidate) => candidate.trainerName === name);
    if (!entry || entry.dialogues.length < minimum) {
      throw new Error(`${name} has only ${entry?.dialogues.length ?? 0} localized dialogues.`);
    }
  }

  const unresolved = entries.flatMap((entry) => entry.unresolvedDialogues ?? []);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved English Rocket dialogues: ${unresolved.join(' | ')}`);
  }
  const englishValues = entries.flatMap((entry) => entry.dialogues).filter(isLikelyEnglishSentence);
  if (englishValues.length > 0) {
    throw new Error(`English text remained in Japanese Rocket dialogues: ${englishValues.join(' | ')}`);
  }

  const dialogueCount = entries.reduce((total, entry) => total + entry.dialogues.length, 0);
  if (dialogueCount < 55) {
    throw new Error(`Only ${dialogueCount} Rocket dialogues were extracted.`);
  }
  return dialogueCount;
}

async function readUsableFallback() {
  try {
    const value = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    if (value?.schemaVersion !== 2) return null;
    const entries = Array.isArray(value.entries) ? value.entries : [];
    const dialogueCount = validateEntries(entries);
    return { trainers: entries.length, dialogues: dialogueCount };
  } catch {
    return null;
  }
}

async function generate() {
  const [leekDuckHtml, serebiiHtml, remoteEnglish, remoteJapanese, apkEnglish, apkJapanese] = await Promise.all([
    fetchText(LEEK_DUCK_URL, 'text/html,application/xhtml+xml'),
    fetchText(SEREBII_URL, 'text/html,application/xhtml+xml'),
    fetchText(POKEMINERS_URLS.remoteEnglish),
    fetchText(POKEMINERS_URLS.remoteJapanese),
    fetchText(POKEMINERS_URLS.apkEnglish),
    fetchText(POKEMINERS_URLS.apkJapanese),
  ]);
  const leekDuckEntries = extractLeekDuckEntries(leekDuckHtml);
  const mixedDialogues = extractSerebiiMixedDialogues(serebiiHtml);
  const englishEntries = mergeMixedGruntDialogues(leekDuckEntries, mixedDialogues);
  const catalog = createLocalizationCatalog([
    {
      name: 'Latest Remote',
      englishEntries: parsePokeMinersLocalization(remoteEnglish),
      japaneseEntries: parsePokeMinersLocalization(remoteJapanese),
    },
    {
      name: 'Latest APK',
      englishEntries: parsePokeMinersLocalization(apkEnglish),
      japaneseEntries: parsePokeMinersLocalization(apkJapanese),
    },
  ]);
  const entries = localizeRocketDialogueEntries(englishEntries, catalog);
  const dialogueCount = validateEntries(entries);

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source: LEEK_DUCK_URL,
    supplementalSources: [SEREBII_URL],
    localizationSources: Object.values(POKEMINERS_URLS),
    entries,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Rocket dialogues:\n- trainers: ${entries.length}\n- dialogues: ${dialogueCount}\n- source: Leek Duck + PokeMiners Japanese localization`);
}

try {
  await generate();
} catch (error) {
  const fallback = await readUsableFallback();
  if (!fallback) throw error;
  console.warn(`Rocket dialogue refresh failed; keeping fallback JSON.\n- trainers: ${fallback.trainers}\n- dialogues: ${fallback.dialogues}\n- reason: ${error instanceof Error ? error.message : String(error)}`);
}
