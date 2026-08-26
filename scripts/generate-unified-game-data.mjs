import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildUnifiedData, validateUnifiedData } from './unified-game-data-utils.mjs';

const OUTPUTS = {
  pokemon: resolve('public/data/unified/pokemon.json'),
  moves: resolve('public/data/unified/moves.json'),
  metadata: resolve('public/data/unified/meta.json'),
};
const LOCAL_INPUTS = {
  pokemon: resolve('public/data/pokemon.json'),
  gameData: resolve('public/data/game-data.json'),
};
const POGO_BASE = 'https://pogoapi.net/api/v1';
const WAT_BASE =
  'https://raw.githubusercontent.com/WatWowMap/pogo-data-api/refs/heads/main/data/v1';
const URLS = {
  pogoStats: `${POGO_BASE}/pokemon_stats.json`,
  pogoTypes: `${POGO_BASE}/pokemon_types.json`,
  pogoCurrentMoves: `${POGO_BASE}/current_pokemon_moves.json`,
  pogoMaxCp: `${POGO_BASE}/pokemon_max_cp.json`,
  pogoEvolutions: `${POGO_BASE}/pokemon_evolutions.json`,
  pogoShiny: `${POGO_BASE}/shiny_pokemon.json`,
  pogoShadow: `${POGO_BASE}/shadow_pokemon.json`,
  pogoFastMoves: `${POGO_BASE}/fast_moves.json`,
  pogoChargedMoves: `${POGO_BASE}/charged_moves.json`,
  pogoPvpFastMoves: `${POGO_BASE}/pvp_fast_moves.json`,
  pogoPvpChargedMoves: `${POGO_BASE}/pvp_charged_moves.json`,
  watPokemon: `${WAT_BASE}/pokemon.json`,
  watForms: `${WAT_BASE}/forms.json`,
  watMoves: `${WAT_BASE}/moves.json`,
  watTypes: `${WAT_BASE}/types.json`,
  watJapanesePokemon: `${WAT_BASE}/translations/ja/pokemon.json`,
  watJapaneseForms: `${WAT_BASE}/translations/ja/forms.json`,
  watJapaneseMoves: `${WAT_BASE}/translations/ja/moves.json`,
};
const MINIMUM_POKEMON = 1_000;
const MINIMUM_MOVES = 300;

async function fetchJson(url, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (attempt === 0 && response.status >= 500) return fetchJson(url, 1);
      throw new Error(`Request failed (${response.status}): ${url}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json') && !contentType.includes('text/plain')) {
      throw new Error(`Unexpected content type (${contentType}): ${url}`);
    }
    return await response.json();
  } catch (error) {
    if (attempt === 0 && error?.name !== 'AbortError') return fetchJson(url, 1);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readLocalJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readExistingOutput() {
  try {
    const [pokemon, moves, metadata] = await Promise.all([
      readLocalJson(OUTPUTS.pokemon),
      readLocalJson(OUTPUTS.moves),
      readLocalJson(OUTPUTS.metadata),
    ]);
    validateUnifiedData({ pokemon, moves, metadata });
    return { pokemon, moves, metadata };
  } catch {
    return null;
  }
}

function validateGeneration(output, previous) {
  validateUnifiedData(output);
  const pokemonCount = output.pokemon.pokemon.length;
  const moveCount = output.moves.moves.length;
  if (pokemonCount < MINIMUM_POKEMON || moveCount < MINIMUM_MOVES) {
    throw new Error(`Unified output was unexpectedly small (${pokemonCount} Pokémon, ${moveCount} moves).`);
  }
  const japaneseCount = output.pokemon.pokemon.filter((entry) =>
    /[ぁ-んァ-ヶ一-龠]/u.test(entry.names.ja),
  ).length;
  if (japaneseCount < Math.floor(pokemonCount * 0.9)) {
    throw new Error(`Japanese name coverage was too low (${japaneseCount}/${pokemonCount}).`);
  }
  if (previous) {
    const previousPokemon = previous.pokemon.pokemon.length;
    const previousMoves = previous.moves.moves.length;
    if (pokemonCount < Math.floor(previousPokemon * 0.7)
      || moveCount < Math.floor(previousMoves * 0.7)) {
      throw new Error('Unified output shrank catastrophically; keeping the checked-in fallback.');
    }
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value)}\n`, 'utf8');
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function generate() {
  const previous = await readExistingOutput();
  const [existingPokemon, gameData, ...remote] = await Promise.all([
    readLocalJson(LOCAL_INPUTS.pokemon),
    readLocalJson(LOCAL_INPUTS.gameData),
    ...Object.values(URLS).map(fetchJson),
  ]);
  const remoteByName = Object.fromEntries(Object.keys(URLS).map((name, index) => [name, remote[index]]));
  const generatedAt = new Date().toISOString();
  const sources = Object.fromEntries(Object.entries(URLS).map(([name, url]) => [
    name,
    { url, fetchedAt: generatedAt, available: true },
  ]));
  sources.existingPokemon = {
    url: 'public/data/pokemon.json',
    fetchedAt: existingPokemon.generatedAt,
    available: true,
  };
  sources.gameData = {
    url: 'public/data/game-data.json',
    fetchedAt: gameData.generatedAt,
    available: true,
  };
  const output = buildUnifiedData({
    generatedAt,
    sources,
    existingPokemon,
    gameData,
    pogo: {
      stats: remoteByName.pogoStats,
      types: remoteByName.pogoTypes,
      currentMoves: remoteByName.pogoCurrentMoves,
      maxCp: remoteByName.pogoMaxCp,
      evolutions: remoteByName.pogoEvolutions,
      shiny: remoteByName.pogoShiny,
      shadow: remoteByName.pogoShadow,
      fastMoves: remoteByName.pogoFastMoves,
      chargedMoves: remoteByName.pogoChargedMoves,
      pvpFastMoves: remoteByName.pogoPvpFastMoves,
      pvpChargedMoves: remoteByName.pogoPvpChargedMoves,
    },
    wat: {
      pokemon: remoteByName.watPokemon,
      forms: remoteByName.watForms,
      moves: remoteByName.watMoves,
      types: remoteByName.watTypes,
      translationsPokemon: remoteByName.watJapanesePokemon,
      translationsForms: remoteByName.watJapaneseForms,
      translationsMoves: remoteByName.watJapaneseMoves,
    },
  });
  validateGeneration(output, previous);
  await Promise.all([
    atomicWriteJson(OUTPUTS.pokemon, output.pokemon),
    atomicWriteJson(OUTPUTS.moves, output.moves),
    atomicWriteJson(OUTPUTS.metadata, output.metadata),
  ]);
  console.log('Unified Pokémon:');
  console.log(`total: ${output.metadata.counts.pokemon}`);
  console.log(`PoGoAPI matched: ${output.metadata.coverage['pokemon.pogoapi']}`);
  console.log(`WatWowMap matched: ${output.metadata.coverage['pokemon.watwowmap']}`);
  console.log(`PokeMiners matched: ${output.metadata.coverage['pokemon.pokeminers']}`);
  console.log(`unmatched forms: ${output.metadata.counts.unmatchedForms}`);
  console.log(`conflicts: ${output.metadata.counts.conflicts}`);
  console.log('Unified Moves:');
  console.log(`total: ${output.metadata.counts.moves}`);
  console.log(`unresolved move names: ${output.metadata.counts.unresolvedMoveNames}`);
}

try {
  await generate();
} catch (error) {
  if (await readExistingOutput()) {
    console.warn(`Unified data refresh failed; keeping the checked-in fallback: ${error.message}`);
  } else {
    throw error;
  }
}
