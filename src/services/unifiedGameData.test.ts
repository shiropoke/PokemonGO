import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UNIFIED_DATA_URLS,
  fetchUnifiedMoveData,
  fetchUnifiedPokemonData,
  getUnifiedMoveById,
  getUnifiedPokemonByDex,
  getUnifiedPokemonByKey,
  parseUnifiedMetadata,
  parseUnifiedMoveDataset,
  parseUnifiedPokemonDataset,
} from './unifiedGameData';

const pokemonDataset = {
  schemaVersion: 1,
  generatedAt: '2026-08-26T00:00:00.000Z',
  pokemon: [{
    key: '1:163',
    pokedexId: 1,
    existingSpeciesId: 'bulbasaur',
    names: { ja: 'フシギダネ', en: 'Bulbasaur' },
    form: { key: '163', id: 163, nameEn: 'Normal' },
    types: ['grass', 'poison'],
    stats: { attack: 118, defense: 111, stamina: 128 },
    flags: { shinyAvailable: true },
    moves: { fast: ['214'], charged: ['90'], eliteFast: [], eliteCharged: [] },
    evolutions: [],
    sourceInfo: { sources: ['pogoapi', 'watwowmap', 'pokeminers'], fieldSources: { stats: 'pokeminers' } },
  }],
};

const moveDataset = {
  schemaVersion: 1,
  generatedAt: '2026-08-26T00:00:00.000Z',
  moves: [{
    key: '214', moveId: 214, gameMasterId: 'VINE_WHIP_FAST',
    names: { ja: 'つるのムチ', en: 'Vine Whip' },
    type: 'grass', kind: 'fast', sources: ['watwowmap', 'pokeminers'],
    fieldSources: { names: 'watwowmap', type: 'pokeminers', kind: 'pokeminers' },
  }],
};

afterEach(() => vi.unstubAllGlobals());

describe('Unified generated data parsers', () => {
  it('pokemon.json / moves.json / meta.json schemaを検証する', () => {
    expect(parseUnifiedPokemonDataset(pokemonDataset).pokemon).toHaveLength(1);
    expect(parseUnifiedMoveDataset(moveDataset).moves).toHaveLength(1);
    expect(parseUnifiedMetadata({
      schemaVersion: 1,
      generatedAt: '2026-08-26T00:00:00.000Z',
      sources: {},
      counts: { pokemon: 1, moves: 1, conflicts: 0, unmatchedForms: 0, unresolvedMoveNames: 0 },
      coverage: {}, unmatchedForms: [], conflicts: [],
    }).counts.pokemon).toBe(1);
  });

  it('invalid schemaと重複keyを拒否する', () => {
    expect(() => parseUnifiedPokemonDataset({ ...pokemonDataset, pokemon: [] }))
      .toThrow(/invalid/u);
    expect(() => parseUnifiedMoveDataset({ ...moveDataset, moves: [moveDataset.moves[0], moveDataset.moves[0]] }))
      .toThrow(/duplicated/u);
  });
});

describe('Unified runtime loader', () => {
  it('ローカルJSONだけをlazy loadし、memory cacheとforceRefreshを扱う', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(
      new Response(JSON.stringify(String(input).endsWith('/moves.json') ? moveDataset : pokemonDataset), { status: 200 }),
    ));
    vi.stubGlobal('fetch', fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await getUnifiedPokemonByKey('1:163'))?.names.ja).toBe('フシギダネ');
    expect(await getUnifiedPokemonByDex(1)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(UNIFIED_DATA_URLS.pokemon);

    await fetchUnifiedPokemonData({ forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ cache: 'no-store' });

    expect((await getUnifiedMoveById(214))?.gameMasterId).toBe('VINE_WHIP_FAST');
    await fetchUnifiedMoveData();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
