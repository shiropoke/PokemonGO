const CHECKS = {
  pogoApi: {
    raidBosses: 'https://pogoapi.net/api/v1/raid_bosses.json',
    currentPokemonMoves:
      'https://pogoapi.net/api/v1/current_pokemon_moves.json',
    pokemonMaxCp: 'https://pogoapi.net/api/v1/pokemon_max_cp.json',
  },
  watWowMap: {
    pokemon:
      'https://raw.githubusercontent.com/WatWowMap/pogo-data-api/refs/heads/main/data/v1/pokemon/1.json',
    move:
      'https://raw.githubusercontent.com/WatWowMap/pogo-data-api/refs/heads/main/data/v1/moves/13.json',
    japanesePokemon:
      'https://raw.githubusercontent.com/WatWowMap/pogo-data-api/refs/heads/main/data/v1/translations/ja/pokemon.json',
  },
};

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getJson(endpoint) {
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GO-Scope-data-source-check',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function run() {
  const [raids, currentMoves, maxCp, pokemon, move, japanesePokemon] =
    await Promise.all([
      getJson(CHECKS.pogoApi.raidBosses),
      getJson(CHECKS.pogoApi.currentPokemonMoves),
      getJson(CHECKS.pogoApi.pokemonMaxCp),
      getJson(CHECKS.watWowMap.pokemon),
      getJson(CHECKS.watWowMap.move),
      getJson(CHECKS.watWowMap.japanesePokemon),
    ]);

  if (!isRecord(raids) || !isRecord(raids.current)) {
    throw new Error('PoGoAPI raid_bosses schema check failed.');
  }
  if (!Array.isArray(currentMoves) || currentMoves.length === 0) {
    throw new Error('PoGoAPI current_pokemon_moves schema check failed.');
  }
  if (!Array.isArray(maxCp) || maxCp.length === 0 || typeof maxCp[0]?.max_cp !== 'number') {
    throw new Error('PoGoAPI pokemon_max_cp schema check failed.');
  }
  if (!isRecord(pokemon) || pokemon.pokedexId !== 1) {
    throw new Error('WatWowMap Pokémon schema check failed.');
  }
  if (!isRecord(move) || move.moveId !== 13) {
    throw new Error('WatWowMap move schema check failed.');
  }
  const japaneseBulbasaur = Array.isArray(japanesePokemon)
    ? japanesePokemon.find((entry) => isRecord(entry) && entry.key === 'poke_1')?.value
    : isRecord(japanesePokemon) ? japanesePokemon.poke_1 : undefined;
  if (typeof japaneseBulbasaur !== 'string') {
    throw new Error('WatWowMap Japanese translation schema check failed.');
  }

  const currentRaidCount = Object.values(raids.current)
    .filter(Array.isArray)
    .reduce((total, entries) => total + entries.length, 0);
  console.log([
    'PoGoAPI: OK',
    `- ${CHECKS.pogoApi.raidBosses} (${currentRaidCount} current bosses)`,
    `- ${CHECKS.pogoApi.currentPokemonMoves} (${currentMoves.length} records)`,
    `- ${CHECKS.pogoApi.pokemonMaxCp} (${maxCp.length} records)`,
    'WatWowMap: OK',
    `- ${CHECKS.watWowMap.pokemon} (${pokemon.pokemonName})`,
    `- ${CHECKS.watWowMap.move} (${move.moveName})`,
    `- ${CHECKS.watWowMap.japanesePokemon} (${japaneseBulbasaur})`,
  ].join('\n'));
}

await run();
