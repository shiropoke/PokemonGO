import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  POGO_API_ENDPOINTS,
  createPogoApiClient,
  parsePogoApiCurrentPokemonMoves,
  parsePogoApiRaidBosses,
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

  it('current Pokémon moves responseを認識する', () => {
    expect(parsePogoApiCurrentPokemonMoves(currentMovesFixture)[0]).toMatchObject({
      pokemon_id: 1,
      fast_moves: ['Vine Whip', 'Tackle'],
      charged_moves: ['Sludge Bomb', 'Seed Bomb'],
    });
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
