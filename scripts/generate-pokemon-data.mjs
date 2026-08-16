import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
const OUTPUT_PATH = resolve('public/data/pokemon.json');

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

async function existingDataIsUsable() {
  try {
    const payload = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    return (
      isRecord(payload) &&
      Array.isArray(payload.pokemon) &&
      payload.pokemon.length > 0
    );
  } catch {
    return false;
  }
}

async function generate() {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`PvPoke Game Master request failed: ${response.status}`);
  }

  const pokemon = extractPokemon(await response.json());
  if (pokemon.length === 0) {
    throw new Error('PvPoke Game Master contained no usable Pokémon data.');
  }

  const output = {
    source: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    pokemon,
  };
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8');
  console.log(`Generated ${pokemon.length} Pokémon records.`);
}

try {
  await generate();
} catch (error) {
  if (await existingDataIsUsable()) {
    console.warn(
      'PvPoke data refresh failed; keeping the committed compact data.',
    );
  } else {
    throw error;
  }
}
