import { describe, expect, it } from 'vitest';
import type { UnifiedMove, UnifiedPokemon } from '../types/unifiedGameData';
import { buildPokedexEntries, filterPokedexEntries, findPokedexPokemonByKey, resolveEvolutionTarget, resolveMoves } from './pokedex';

function pokemon(key: string, dex: number, form = 'Normal', extras: Partial<UnifiedPokemon> = {}): UnifiedPokemon {
  return {
    key, pokedexId: dex, existingSpeciesId: key, names: { ja: dex === 25 ? 'ピカチュウ' : 'フシギダネ', en: dex === 25 ? 'Pikachu' : 'Bulbasaur' },
    form: { key: form, id: form === 'Normal' ? 1 : 2, nameEn: form }, types: dex === 25 ? ['electric'] : ['grass', 'poison'], flags: {},
    moves: { fast: ['fast'], charged: ['charged'], eliteFast: ['elite-fast'], eliteCharged: ['elite-charged'] }, evolutions: [], sourceInfo: { sources: ['pogoapi'], fieldSources: {} }, ...extras,
  };
}

describe('pokedex helpers', () => {
  const normal = pokemon('25:normal', 25);
  const costume = pokemon('25:costume', 25, 'Party Hat');
  const bulbasaur = pokemon('1:normal', 1);

  it('同一dexの複数formを一覧で1件にまとめ、Normalを代表にする', () => {
    const entries = buildPokedexEntries([costume, normal, bulbasaur]);
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.pokedexId === 25)).toMatchObject({ representative: { key: '25:normal' }, forms: [{ key: '25:normal' }, { key: '25:costume' }] });
  });

  it.each(['ピカチュウ', 'ぴかちゅう', 'Pikachu', '25', '025', '#025'])('日本語・英語・図鑑番号で検索できる: %s', (query) => {
    const entries = filterPokedexEntries(buildPokedexEntries([normal, costume, bulbasaur]), { query, type: 'all', generation: 'all', sort: 'dex-asc' });
    expect(entries.map((entry) => entry.pokedexId)).toEqual([25]);
  });

  it('タイプfilterはフォームが持つタイプを判定する', () => {
    const entries = filterPokedexEntries(buildPokedexEntries([normal, bulbasaur]), { query: '', type: 'electric', generation: 'all', sort: 'dex-asc' });
    expect(entries.map((entry) => entry.pokedexId)).toEqual([25]);
  });

  it('進化先とmove keyを安全に解決し、Eliteを通常技へ混ぜない', () => {
    const target = pokemon('2:normal', 2);
    const move = (key: string): UnifiedMove => ({ key, names: { ja: key, en: key }, type: 'grass', kind: 'fast', sources: ['pogoapi'], fieldSources: {} });
    expect(resolveEvolutionTarget('2:normal', [normal, target])?.pokedexId).toBe(2);
    expect(resolveEvolutionTarget('missing', [normal, target])).toBeUndefined();
    expect(findPokedexPokemonByKey('missing', [normal, target])).toBeUndefined();
    expect(resolveMoves(normal.moves.fast, [move('fast'), move('elite-fast')]).map((entry) => entry.key)).toEqual(['fast']);
    expect(resolveMoves(normal.moves.eliteFast, [move('fast'), move('elite-fast')]).map((entry) => entry.key)).toEqual(['elite-fast']);
  });
});
