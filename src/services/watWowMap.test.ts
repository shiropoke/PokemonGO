import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  WATWOWMAP_DATASETS,
  createWatWowMapClient,
  parseWatWowMapInvasions,
  parseWatWowMapMoveCollection,
  parseWatWowMapPokemon,
  parseWatWowMapPokemonCollection,
  parseWatWowMapTranslations,
} from './watWowMap';
import { ExternalDataValidationError } from '../types/externalData';

const pokemonFixture = {
  pokemonName: 'Bulbasaur',
  pokedexId: 1,
  defaultFormId: 163,
  forms: [163, 897],
  types: [4, 12],
  quickMoves: [214, 221],
  chargedMoves: [59, 90, 118],
  eliteQuickMoves: [],
  eliteChargedMoves: [],
  attack: 118,
  defense: 111,
  stamina: 128,
  genId: 1,
  generation: 'Kanto',
  height: 0.7,
  weight: 6.9,
  buddyGroupNumber: 2,
  buddyDistance: 3,
  buddyMegaEnergy: 15,
  thirdMoveStardust: 10000,
  thirdMoveCandy: 25,
  gymDefenderEligible: true,
  tradable: true,
  transferable: true,
  purificationDust: 3000,
  purificationCandy: 3,
  sizeSettings: [{ name: 'xxsLowerBound', value: 0.343 }],
  evolutions: [{ evoId: 2, formId: 166, candyCost: 25 }],
};

const moveFixture = {
  moveId: 13,
  moveName: 'Wrap',
  proto: 'WRAP',
  fast: false,
  type: 1,
  power: 60,
  durationMs: 3000,
  energyDelta: -33,
  pvpPower: 70,
  pvpEnergyDelta: -45,
  pvpBuffs: { targetDefenseStatStageChange: -1, buffActivationChance: 1 },
};

const invasionFixture = {
  id: 4,
  type: 'Mixed',
  gender: 1,
  grunt: 'Grunt',
  proto: 'CHARACTER_GRUNT_MALE',
  active: true,
  firstReward: true,
  secondReward: false,
  thirdReward: false,
  encounters: [{ id: 1, position: 'first' }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WatWowMap response parsers', () => {
  it('pokemon collectionをparseしてPokédex IDとform IDを保持する', () => {
    expect(parseWatWowMapPokemonCollection([pokemonFixture])[0]).toMatchObject({
      pokedexId: 1,
      defaultFormId: 163,
      forms: [163, 897],
    });
  });

  it('single Pokémonをparseできる', () => {
    expect(parseWatWowMapPokemon(pokemonFixture)).toMatchObject({
      pokemonName: 'Bulbasaur',
      evolutions: [{ evoId: 2, formId: 166, candyCost: 25 }],
      height: 0.7,
      buddyDistance: 3,
      thirdMoveStardust: 10000,
      purificationCandy: 3,
      sizeSettings: [{ name: 'xxsLowerBound', value: 0.343 }],
    });
  });

  it('movesをparseできる', () => {
    expect(parseWatWowMapMoveCollection([moveFixture])[0]).toMatchObject({
      moveId: 13,
      moveName: 'Wrap',
      energyDelta: -33,
      pvpBuffs: { targetDefenseStatStageChange: -1, buffActivationChance: 1 },
    });
  });

  it('invasionsをparseできる', () => {
    expect(parseWatWowMapInvasions([invasionFixture])[0]).toMatchObject({
      id: 4,
      active: true,
      encounters: [{ id: 1, position: 'first' }],
    });
  });

  it('Japanese translation categoryをparseできる', () => {
    expect(parseWatWowMapTranslations([{ key: 'poke_1', value: 'フシギダネ' }])).toEqual({
      poke_1: 'フシギダネ',
    });
  });
});

describe('WatWowMap client', () => {
  it('collectionとsingle itemを別endpointから取得できる', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.resolve(
      new Response(
        JSON.stringify(String(input).endsWith('/pokemon.json')
          ? [pokemonFixture]
          : pokemonFixture),
        { status: 200 },
      ),
    ));
    vi.stubGlobal('fetch', fetchMock);
    const client = createWatWowMapClient();

    const collection = await client.fetchPokemonCollection();
    const single = await client.fetchPokemonById(1);
    expect(collection.endpoint).toBe(WATWOWMAP_DATASETS.pokemon);
    expect(collection.data).toHaveLength(1);
    expect(single.endpoint).toMatch(/\/pokemon\/1\.json$/);
    expect(single.data.pokedexId).toBe(1);
  });

  it('move single itemを取得できる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(moveFixture), { status: 200 }),
    ));
    const result = await createWatWowMapClient().fetchMoveById(13);
    expect(result.data).toMatchObject({ moveId: 13, proto: 'WRAP' });
  });

  it('日本語translationをcategory単位で取得できる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ key: 'move_1', value: 'でんきショック' }]), { status: 200 }),
    ));
    const result = await createWatWowMapClient()
      .fetchJapaneseTranslationCategory('moves');
    expect(result.endpoint).toMatch(/\/translations\/ja\/moves\.json$/);
    expect(result.data.move_1).toBe('でんきショック');
  });

  it('HTTP errorを適切に扱う', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(
      createWatWowMapClient().fetchPokemonById(9999),
    ).rejects.toMatchObject({
      name: 'ExternalDataFetchError',
      source: 'watwowmap',
      failure: 'http',
      status: 404,
    });
  });

  it('invalid schemaを拒否する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pokemonName: 'Missing IDs' }), { status: 200 }),
    ));
    await expect(
      createWatWowMapClient().fetchPokemonById(1),
    ).rejects.toBeInstanceOf(ExternalDataValidationError);
  });
});
