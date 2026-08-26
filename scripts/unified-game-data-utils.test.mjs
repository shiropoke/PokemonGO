import { describe, expect, it } from 'vitest';
import { buildUnifiedData, normalizeIdentifier, validateUnifiedData } from './unified-game-data-utils.mjs';

function fixture(overrides = {}) {
  const existingPokemon = {
    pokemon: [
      { dex: 1, speciesId: 'bulbasaur', speciesName: 'Bulbasaur', displayNameJa: '既存フシギダネ', baseStats: { atk: 118, def: 111, hp: 128 } },
      { dex: 1, speciesId: 'bulbasaur_shadow', speciesName: 'Bulbasaur (Shadow)', displayNameJa: 'フシギダネ（シャドウ）', baseStats: { atk: 118, def: 111, hp: 128 } },
      { dex: 2, speciesId: 'ivysaur', speciesName: 'Ivysaur', displayNameJa: 'フシギソウ', baseStats: { atk: 151, def: 143, hp: 155 } },
    ],
  };
  const gameData = {
    pokemon: {
      bulbasaur: {
        speciesId: 'bulbasaur', types: ['grass', 'poison'],
        fastMoveIds: ['VINE_WHIP_FAST'], chargedMoveIds: ['SEED_BOMB'],
        eliteFastMoveIds: [], eliteChargedMoveIds: [],
        evolutions: [{ speciesId: 'ivysaur', candyCost: 25 }],
      },
      ivysaur: {
        speciesId: 'ivysaur', types: ['grass', 'poison'], fastMoveIds: [],
        chargedMoveIds: [], eliteFastMoveIds: [], eliteChargedMoveIds: [], evolutions: [],
      },
    },
    moves: {
      VINE_WHIP_FAST: { id: 'VINE_WHIP_FAST', name: 'つるのムチ', type: 'grass', kind: 'fast', pve: { power: 7, durationMs: 500, energyDelta: 6 } },
      SEED_BOMB: { id: 'SEED_BOMB', name: 'タネばくだん', type: 'grass', kind: 'charged', pve: { power: 55, energyDelta: -33 } },
      LEGACY_MOVE: { id: 'LEGACY_MOVE', name: '過去技', type: 'normal', kind: 'charged', pve: { power: 1 } },
    },
  };
  const wat = {
    pokemon: [
      { pokedexId: 1, pokemonName: 'Bulbasaur', defaultFormId: 163, forms: [163], types: [12, 4], quickMoves: [214], chargedMoves: [90, 999], eliteQuickMoves: [], eliteChargedMoves: [], attack: 120, defense: 111, stamina: 128, height: 0.7, weight: 6.9, buddyDistance: 3, buddyGroupNumber: 2, thirdMoveStardust: 10000, thirdMoveCandy: 25, evolutions: [{ evoId: 2, formId: 166, candyCost: 25 }] },
      { pokedexId: 2, pokemonName: 'Ivysaur', defaultFormId: 166, forms: [166], types: [12, 4], quickMoves: [], chargedMoves: [], eliteQuickMoves: [], eliteChargedMoves: [], attack: 151, defense: 143, stamina: 155, evolutions: [] },
    ],
    forms: [
      { formId: 163, formName: 'Normal', proto: 'BULBASAUR_NORMAL', evolutions: [{ evoId: 2, formId: 166, candyCost: 25 }], purificationDust: 3000, purificationCandy: 3 },
      { formId: 166, formName: 'Normal', proto: 'IVYSAUR_NORMAL' },
    ],
    moves: [
      { moveId: 214, moveName: 'Vine Whip', proto: 'VINE_WHIP_FAST', fast: true, type: 12, power: 8, pvpPower: 5, pvpEnergyDelta: 8 },
      { moveId: 90, moveName: 'Seed Bomb', proto: 'SEED_BOMB', fast: false, type: 12, power: 60, pvpPower: 65, pvpEnergyDelta: -40, pvpBuffs: { targetDefenseStatStageChange: -1, buffActivationChance: 0.5 } },
      { moveId: 999, moveName: 'Legacy Move', proto: 'LEGACY_MOVE', fast: false, type: 1, power: 1 },
    ],
    types: [
      { typeId: 1, typeName: 'Normal' },
      { typeId: 4, typeName: 'Poison' },
      { typeId: 12, typeName: 'Grass' },
    ],
    translationsPokemon: [{ key: 'poke_1', value: 'フシギダネ' }, { key: 'poke_2', value: 'フシギソウ' }],
    translationsForms: [{ key: 'form_163', value: 'ノーマル' }, { key: 'form_166', value: 'ノーマル' }],
    translationsMoves: [{ key: 'move_214', value: 'つるのムチ' }, { key: 'move_90', value: 'タネばくだん' }],
  };
  const pogo = {
    stats: [
      { pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', base_attack: 119, base_defense: 111, base_stamina: 128 },
      { pokemon_id: 2, pokemon_name: 'Ivysaur', form: 'Normal', base_attack: 151, base_defense: 143, base_stamina: 155 },
    ],
    types: [{ pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', type: ['Grass', 'Poison'] }],
    currentMoves: [{ pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', fast_moves: ['Vine Whip'], charged_moves: ['Seed Bomb'], elite_fast_moves: [], elite_charged_moves: [] }],
    maxCp: [{ pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', max_cp: 1275 }],
    evolutions: [{ pokemon_id: 1, pokemon_name: 'Bulbasaur', form: 'Normal', evolutions: [{ pokemon_id: 2, pokemon_name: 'Ivysaur', form: 'Normal', candy_required: 25, item_required: 'Test Item' }] }],
    shiny: { 1: { id: 1, name: 'Bulbasaur', found_wild: true, found_raid: false, found_egg: true, found_evolution: false, found_research: true, found_photobomb: false } },
    shadow: { 1: { id: 1, name: 'Bulbasaur' } },
    fastMoves: [{ move_id: 214, name: 'Vine Whip', type: 'Grass', power: 8, energy_delta: 6, duration: 500 }],
    chargedMoves: [{ move_id: 90, name: 'Seed Bomb', type: 'Grass', power: 60, energy_delta: -33 }],
    pvpFastMoves: [{ move_id: 214, name: 'Vine Whip', type: 'Grass', power: 5, energy_delta: 8, turn_duration: 2 }],
    pvpChargedMoves: [{ move_id: 90, name: 'Seed Bomb', type: 'Grass', power: 65, energy_delta: -40 }],
  };
  return { existingPokemon, gameData, wat, pogo, generatedAt: '2026-08-26T00:00:00.000Z', sources: {}, ...overrides };
}

describe('Unified game data merge', () => {
  it('joins three sources by Pokédex ID and exact form identity', () => {
    const result = buildUnifiedData(fixture());
    const bulbasaur = result.pokemon.pokemon.find((entry) => entry.key === '1:163');
    expect(bulbasaur).toMatchObject({
      pokedexId: 1,
      existingSpeciesId: 'bulbasaur',
      names: { ja: 'フシギダネ', en: 'Bulbasaur' },
      types: ['grass', 'poison'],
      stats: { attack: 118, defense: 111, stamina: 128 },
      maxCp: 1275,
      size: { heightM: 0.7, weightKg: 6.9 },
      buddy: { group: 2, candyDistanceKm: 3 },
      secondMoveCost: { stardust: 10000, candy: 25 },
      flags: { shinyAvailable: true, shadowAvailable: true },
    });
    expect(bulbasaur.sourceInfo.sources).toEqual(expect.arrayContaining(['existing', 'pokeminers', 'watwowmap', 'pogoapi']));
  });

  it('uses existing Game Master stats and records source conflicts without averaging', () => {
    const result = buildUnifiedData(fixture());
    expect(result.pokemon.pokemon.find((entry) => entry.key === '1:163').stats.attack).toBe(118);
    expect(result.metadata.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: '1:163', field: 'stats', selectedSource: 'pokeminers' }),
    ]));
  });

  it('keeps exact forms separate and never merges an ambiguous form into Normal', () => {
    const input = fixture();
    input.wat.pokemon[0].forms.push(164);
    input.wat.forms.push({ formId: 164, formName: 'Alola', proto: 'BULBASAUR_ALOLA' });
    input.existingPokemon.pokemon.push({ dex: 1, speciesId: 'bulbasaur_mystery', speciesName: 'Bulbasaur (Mystery)', displayNameJa: '謎', baseStats: { atk: 1, def: 1, hp: 1 } });
    const result = buildUnifiedData(input);
    expect(result.pokemon.pokemon.some((entry) => entry.key === '1:164')).toBe(true);
    expect(result.pokemon.pokemon.some((entry) => entry.key === 'existing:1:bulbasaur_mystery')).toBe(true);
    expect(result.metadata.counts.unmatchedForms).toBeGreaterThan(0);
  });

  it('uses Japanese names in WatWowMap → existing data → English fallback order', () => {
    const withWat = buildUnifiedData(fixture());
    expect(withWat.pokemon.pokemon.find((entry) => entry.key === '1:163').names.ja).toBe('フシギダネ');
    const noWatInput = fixture();
    noWatInput.wat.translationsPokemon = [];
    const withExisting = buildUnifiedData(noWatInput);
    expect(withExisting.pokemon.pokemon.find((entry) => entry.key === '1:163').names.ja).toBe('既存フシギダネ');
  });

  it('merges move details by numeric move ID and retains PvE, PvP and buffs', () => {
    const result = buildUnifiedData(fixture());
    const move = result.moves.moves.find((entry) => entry.moveId === 90);
    expect(move).toMatchObject({
      key: '90', gameMasterId: 'SEED_BOMB', names: { ja: 'タネばくだん', en: 'Seed Bomb' },
      pve: { power: 55 }, pvp: { power: 65, energyDelta: -40 },
      buffs: { targetDefense: -1, activationChance: 0.5 },
    });
  });

  it('uses PoGoAPI current moves without adding a WatWowMap-only legacy move', () => {
    const result = buildUnifiedData(fixture());
    const bulbasaur = result.pokemon.pokemon.find((entry) => entry.key === '1:163');
    expect(bulbasaur.moves.charged).toEqual(['90']);
    expect(bulbasaur.moves.charged).not.toContain('999');
  });

  it('merges one evolution edge and complements candy and item conditions', () => {
    const result = buildUnifiedData(fixture());
    const evolution = result.pokemon.pokemon.find((entry) => entry.key === '1:163').evolutions;
    expect(evolution).toHaveLength(1);
    expect(evolution[0]).toMatchObject({
      targetKey: '2:166', targetPokedexId: 2,
      conditions: { candy: 25, item: 'Test Item' },
      sources: expect.arrayContaining(['watwowmap', 'pogoapi', 'pokeminers']),
    });
  });

  it('validates generated datasets and detects orphan move references', () => {
    const output = buildUnifiedData(fixture());
    expect(validateUnifiedData(output)).toBe(true);
    output.pokemon.pokemon[0].moves.fast.push('missing');
    expect(() => validateUnifiedData(output)).toThrow(/Orphan move reference/u);
  });

  it('normalizes only deterministic form identifiers', () => {
    expect(normalizeIdentifier('Alolan Form')).toBe('alola');
    expect(normalizeIdentifier('Mega X')).toBe('megax');
  });
});
