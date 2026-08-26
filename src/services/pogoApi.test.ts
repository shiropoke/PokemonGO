import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  POGO_API_ENDPOINTS,
  createPogoApiClient,
  parsePogoApiCurrentPokemonMoves,
  parsePogoApiPokemonEvolutions,
  parsePogoApiPokemonForms,
  parsePogoApiPokemonMaxCp,
  parsePogoApiRaidBosses,
  parsePogoApiShadowPokemon,
  parsePogoApiShinyPokemon,
} from './pogoApi';
import {
  ExternalDataValidationError,
} from '../types/externalData';

const statsFixture = [{
  pokemon_id: 1,
  pokemon_name: 'Bulbasaur',
  form: 'Normal',
  base_attack: 118,
  base_defense: 111,
  base_stamina: 128,
}];

const raidFixture = {
  current: {
    5: [{
      boosted_weather: ['Clear', 'Snow'],
      form: 'Normal',
      id: 485,
      max_boosted_cp: 2681,
      max_unboosted_cp: 2145,
      min_boosted_cp: 2573,
      min_unboosted_cp: 2058,
      name: 'Heatran',
      possible_shiny: true,
      tier: 5,
      type: ['Fire', 'Steel'],
    }],
  },
  previous: {},
};

const currentMovesFixture = [{
  charged_moves: ['Sludge Bomb', 'Seed Bomb'],
  elite_charged_moves: [],
  elite_fast_moves: [],
  fast_moves: ['Vine Whip', 'Tackle'],
  form: 'Normal',
  pokemon_id: 1,
  pokemon_name: 'Bulbasaur',
}];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PoGoAPI response parsers', () => {
  it('現在のraid boss responseを認識する', () => {
    const parsed = parsePogoApiRaidBosses(raidFixture);
    expect(parsed.current['5']?.[0]).toMatchObject({
      id: 485,
      name: 'Heatran',
      tier: 5,
      type: ['Fire', 'Steel'],
    });
  });

  it('record自身にtierが無くても外側のtier keyを引き継ぐ', () => {
    const parsed = parsePogoApiRaidBosses({
      current: {
        5: [{
          id: 377,
          name: 'Regirock',
          form: 'Normal',
          type: ['Rock'],
          boosted_weather: ['Partly Cloudy'],
          possible_shiny: true,
          min_unboosted_cp: 1703,
          max_unboosted_cp: 1784,
          min_boosted_cp: 2129,
          max_boosted_cp: 2230,
        }],
      },
      previous: {},
    });

    expect(parsed.current['5']?.[0]?.tier).toBe('5');
  });

  it('履歴previousが欠落してもcurrentだけを有効な現在レイドとして扱う', () => {
    const parsed = parsePogoApiRaidBosses({ current: raidFixture.current });
    expect(parsed.current['5']).toHaveLength(1);
    expect(parsed.previous).toEqual({});
  });

  it('current Pokémon moves responseを認識する', () => {
    expect(parsePogoApiCurrentPokemonMoves(currentMovesFixture)[0]).toMatchObject({
      pokemon_id: 1,
      fast_moves: ['Vine Whip', 'Tackle'],
      charged_moves: ['Sludge Bomb', 'Seed Bomb'],
    });
  });

  it('Unified Data用の現行Pokemon schemaを認識する', () => {
    expect(parsePogoApiPokemonForms(['Normal', 'Alola'])).toEqual(['Normal', 'Alola']);
    expect(parsePogoApiPokemonMaxCp([{
      pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', max_cp: 1275,
    }])[0]).toMatchObject({ pokemon_id: 1, form: 'Normal', max_cp: 1275 });
    expect(parsePogoApiPokemonEvolutions([{
      pokemon_id: 1,
      pokemon_name: 'Bulbasaur',
      form: 'Normal',
      evolutions: [{
        pokemon_id: 2, pokemon_name: 'Ivysaur', form: 'Normal',
        candy_required: 25, item_required: 'Test Item', only_evolves_in_daytime: true,
      }],
    }])[0]?.evolutions[0]).toMatchObject({
      pokemon_id: 2, candy_required: 25, item_required: 'Test Item',
      only_evolves_in_daytime: true,
    });
    expect(parsePogoApiShinyPokemon({
      1: {
        id: 1, name: 'Bulbasaur', found_wild: true, found_raid: false,
        found_egg: true, found_evolution: false, found_research: true,
        found_photobomb: false,
      },
    })['1']?.found_wild).toBe(true);
    expect(parsePogoApiShadowPokemon({ 1: { id: 1, name: 'Bulbasaur' } })['1'])
      .toEqual({ id: 1, name: 'Bulbasaur' });
  });
});

describe('PoGoAPI client', () => {
  it('正常なJSONを検証しsource metadata付きで返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(statsFixture), { status: 200 }),
    ));
    const result = await createPogoApiClient().fetchPokemonStats();

    expect(result).toMatchObject({
      source: 'pogoapi',
      endpoint: POGO_API_ENDPOINTS.pokemonStats,
    });
    expect(result.fetchedAt).toEqual(expect.any(Number));
    expect(result.data[0]?.base_attack).toBe(118);
  });

  it('HTTP errorをstatus付きで返し、404はretryしない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createPogoApiClient().fetchRaidBosses(),
    ).rejects.toMatchObject({
      name: 'ExternalDataFetchError',
      failure: 'http',
      status: 404,
      source: 'pogoapi',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('invalid JSONとinvalid schemaを区別して拒否する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('{not-json', { status: 200 }),
    ));
    await expect(
      createPogoApiClient().fetchRaidBosses({ retryCount: 0 }),
    ).rejects.toMatchObject({ failure: 'invalid-json' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ current: 'wrong', previous: {} }), {
        status: 200,
      }),
    ));
    await expect(
      createPogoApiClient().fetchRaidBosses({ retryCount: 0 }),
    ).rejects.toBeInstanceOf(ExternalDataValidationError);
  });

  it('呼び出し側AbortSignalをabortedとして扱う', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createPogoApiClient().fetchPokemonStats({ signal: controller.signal }),
    ).rejects.toMatchObject({ failure: 'aborted' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('同一endpointの同時requestを1回のfetchへまとめる', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createPogoApiClient();

    const first = client.fetchPokemonStats();
    const second = client.fetchPokemonStats();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse?.(new Response(JSON.stringify(statsFixture), { status: 200 }));

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forceRefreshはmemory cacheを無視してno-storeで取得する', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify(statsFixture), { status: 200 }),
    ));
    vi.stubGlobal('fetch', fetchMock);
    const client = createPogoApiClient();

    await client.fetchPokemonStats();
    await client.fetchPokemonStats();
    await client.fetchPokemonStats({ forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ cache: 'no-store' });
  });
});
