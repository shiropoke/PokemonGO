import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaidBoss } from '../types/raids';
import type { UnifiedMove, UnifiedPokemon } from '../types/unifiedGameData';

const mocks = vi.hoisted(() => ({
  loadRaids: vi.fn(),
  fetchUnifiedPokemonData: vi.fn(),
  fetchUnifiedMoveData: vi.fn(),
}));

vi.mock('./scrapedDuck', () => ({
  SCRAPED_DUCK_CACHE_TTL_MS: 5 * 60 * 1000,
  loadRaids: mocks.loadRaids,
}));
vi.mock('./unifiedGameData', () => ({
  fetchUnifiedPokemonData: mocks.fetchUnifiedPokemonData,
  fetchUnifiedMoveData: mocks.fetchUnifiedMoveData,
}));

import { findUnifiedPokemonForRaid, loadRaidData } from './raidData';

function raid(name: string, extras: Partial<RaidBoss> = {}): RaidBoss {
  return {
    id: `raid-${name}`, name, displayName: name, speciesId: null,
    tier: '5-Star Raids', isShadow: /^Shadow /i.test(name), isMega: /^Mega /i.test(name),
    canBeShiny: true, types: ['rock'],
    combatPower: { normal: { min: 1000, max: 1100 }, boosted: { min: 1200, max: 1300 } },
    boostedWeather: ['partly cloudy'], image: 'https://example.com/raid.png',
    sources: { membership: 'scrapedduck', details: 'scrapedduck', image: 'scrapedduck' },
    ...extras,
  };
}

function pokemon(
  dex: number,
  formName = 'Normal',
  options: Partial<UnifiedPokemon> = {},
): UnifiedPokemon {
  return {
    key: `${dex}:${formName}`, pokedexId: dex, existingSpeciesId: `pokemon_${dex}`,
    names: { ja: `日本語${dex}`, en: `Pokemon ${dex}` },
    form: { key: formName, id: 1, nameEn: formName, pogoApi: formName },
    types: ['rock'], stats: { attack: 200, defense: 180, stamina: 160 }, maxCp: 3000,
    size: { heightM: 1.2, weightKg: 34.5 }, buddy: { candyDistanceKm: 5 },
    secondMoveCost: { stardust: 75000, candy: 75 }, purificationCost: { stardust: 5000, candy: 5 },
    flags: {}, moves: { fast: ['fast-1'], charged: ['charged-1'], eliteFast: ['elite-fast-1'], eliteCharged: ['elite-charged-1'] },
    evolutions: [], sourceInfo: { sources: ['pogoapi'], fieldSources: {} },
    ...options,
  };
}

function move(key: string, ja: string): UnifiedMove {
  return {
    key, names: { ja, en: key }, type: 'rock', kind: key.includes('charged') ? 'charged' : 'fast',
    sources: ['pogoapi'], fieldSources: {},
  };
}

function setDatasets(raids: RaidBoss[], pokemonEntries: UnifiedPokemon[] = [], moves: UnifiedMove[] = []) {
  mocks.loadRaids.mockResolvedValue({ data: raids, fetchedAt: 123, source: 'network', stale: false });
  mocks.fetchUnifiedPokemonData.mockResolvedValue({ pokemon: pokemonEntries });
  mocks.fetchUnifiedMoveData.mockResolvedValue({ moves });
}

beforeEach(() => {
  mocks.loadRaids.mockReset();
  mocks.fetchUnifiedPokemonData.mockReset();
  mocks.fetchUnifiedMoveData.mockReset();
});

describe('ScrapedDuck主導のレイド統合', () => {
  it('current membershipはScrapedDuck raidsだけを使い、他sourceの候補を追加しない', async () => {
    setDatasets([raid('A'), raid('B'), raid('C')]);

    const result = await loadRaidData({ forceRefresh: true });

    expect(result.data.map((entry) => entry.name)).toEqual(['A', 'B', 'C']);
    expect(result.provider).toBe('scrapedduck');
    expect(mocks.loadRaids).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('Unifiedで日本語名・型・種族値・最大CP・サイズ・相棒・技・進化を補完し、レイドCPと色違いは保持する', async () => {
    const evolved = pokemon(2, 'Normal', { names: { ja: '進化先', en: 'Evolution' }, moves: { fast: [], charged: [], eliteFast: [], eliteCharged: [] } });
    const source = pokemon(1, 'Normal', {
      existingSpeciesId: 'bulbasaur', names: { ja: 'フシギダネ', en: 'Bulbasaur' }, types: ['grass', 'poison'],
      evolutions: [{ targetKey: evolved.key, targetPokedexId: 2, targetFormId: 1, conditions: {}, sources: ['pogoapi'] }],
    });
    setDatasets(
      [raid('Bulbasaur', { speciesId: 'bulbasaur', canBeShiny: false })],
      [source, evolved],
      [move('fast-1', 'つるのムチ'), move('charged-1', 'ヘドロばくだん'), move('elite-fast-1', 'たいあたり'), move('elite-charged-1', 'ハードプラント')],
    );

    const result = await loadRaidData();
    const enriched = result.data[0]!;

    expect(enriched).toMatchObject({
      displayName: 'フシギダネ', pokedexId: 1, unifiedPokemonKey: source.key,
      types: ['grass', 'poison'], canBeShiny: false,
      combatPower: { normal: { min: 1000, max: 1100 } },
      pokemonDetails: {
        maxCp: 3000, buddyDistanceKm: 5, size: { heightM: 1.2, weightKg: 34.5 },
        stats: { attack: 200, defense: 180, stamina: 160 }, evolutions: ['進化先'],
        moves: { fast: ['つるのムチ'], charged: ['ヘドロばくだん'], eliteFast: ['たいあたり'], eliteCharged: ['ハードプラント'] },
      },
    });
  });

  it('Unified Dataの取得に失敗してもScrapedDuckのレイド一覧を表示する', async () => {
    mocks.loadRaids.mockResolvedValue({ data: [raid('Shadow Snorlax')], fetchedAt: 123, source: 'network', stale: false });
    mocks.fetchUnifiedPokemonData.mockRejectedValue(new Error('offline'));
    mocks.fetchUnifiedMoveData.mockResolvedValue({ moves: [] });

    const result = await loadRaidData();

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ name: 'Shadow Snorlax', isShadow: true });
    expect(result.data[0]?.pokemonDetails).toBeUndefined();
  });

  it('Normal・Mega・Mega X・regional・costumeを別formとして扱い、曖昧なcostumeを通常formへ誤mergeしない', () => {
    const normal = pokemon(6, 'Normal', { names: { ja: 'リザードン', en: 'Charizard' }, existingSpeciesId: 'charizard' });
    const mega = pokemon(6, 'Mega', { key: 'temp:6:1', names: { ja: 'リザードン', en: 'Charizard (Mega)' }, form: { key: 'temp:1', id: null, nameEn: 'Mega', temporaryEvolutionId: 1 }, existingSpeciesId: 'charizard_mega' });
    const megaX = pokemon(6, 'Mega X', { key: 'temp:6:2', names: { ja: 'リザードン', en: 'Charizard (Mega X)' }, form: { key: 'temp:2', id: null, nameEn: 'Mega X', temporaryEvolutionId: 2 }, existingSpeciesId: 'charizard_mega_x' });
    const alola = pokemon(26, 'Alola', { names: { ja: 'ライチュウ（アローラ）', en: 'Raichu' }, existingSpeciesId: 'raichu_alola', form: { key: 'alola', id: 2, nameEn: 'Alola', pogoApi: 'Alola' } });
    const costume = pokemon(6, 'Party Hat', { key: '6:costume', names: { ja: 'リザードン（Party Hat）', en: 'Charizard' }, existingSpeciesId: undefined, form: { key: 'costume', id: 9, nameEn: 'Party Hat', pogoApi: 'Party_Hat', costumeId: 9 } });
    const all = [normal, mega, megaX, alola, costume];

    expect(findUnifiedPokemonForRaid(raid('Charizard', { speciesId: 'charizard' }), all)?.key).toBe(normal.key);
    expect(findUnifiedPokemonForRaid(raid('Mega Charizard', { isMega: true, speciesId: 'charizard_mega' }), all)?.key).toBe(mega.key);
    expect(findUnifiedPokemonForRaid(raid('Mega Charizard X', { isMega: true, speciesId: 'charizard_mega_x' }), all)?.key).toBe(megaX.key);
    expect(findUnifiedPokemonForRaid(raid('Alolan Raichu', { speciesId: 'raichu_alola' }), all)?.key).toBe(alola.key);
    expect(findUnifiedPokemonForRaid(raid('Charizard (Party Hat)'), all)?.key).toBe(costume.key);
    expect(findUnifiedPokemonForRaid(raid('Charizard (Unknown Hat)'), all)).toBeUndefined();
  });

  it('Shadowはstateとして維持し、通常formのUnified情報を安全に補完する', () => {
    const snorlax = pokemon(143, 'Normal', { existingSpeciesId: 'snorlax', names: { ja: 'カビゴン', en: 'Snorlax' } });
    const shadow = raid('Shadow Snorlax', { speciesId: 'snorlax', isShadow: true });

    expect(findUnifiedPokemonForRaid(shadow, [snorlax])?.key).toBe(snorlax.key);
    expect(shadow.isShadow).toBe(true);
  });

  it('Shadowの表示名は状態を残し、Mega Xの表示名はformを失わない', async () => {
    const snorlax = pokemon(143, 'Normal', { existingSpeciesId: 'snorlax', names: { ja: 'カビゴン', en: 'Snorlax' } });
    const megaX = pokemon(6, 'Mega X', { key: 'temp:6:2', existingSpeciesId: 'charizard_mega_x', names: { ja: 'リザードン', en: 'Charizard (Mega X)' }, form: { key: 'temp:2', id: null, nameEn: 'Mega X', temporaryEvolutionId: 2 } });
    setDatasets([raid('Shadow Snorlax', { speciesId: 'snorlax', isShadow: true }), raid('Mega Charizard X', { speciesId: 'charizard_mega_x', isMega: true })], [snorlax, megaX]);

    const result = await loadRaidData();

    expect(result.data.map((entry) => entry.displayName)).toEqual(['カビゴン（シャドウ）', 'メガリザードンX']);
  });
});
