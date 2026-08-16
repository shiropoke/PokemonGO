import { describe, expect, it } from 'vitest';
import {
  getPokemonDisplayName,
  getPokemonNameJa,
  replacePokemonNamesInText,
} from './pokemonLocalization';

describe('Pokémon日本語名', () => {
  it('内部speciesIdを日本語の種族名へ変換する', () => {
    expect(getPokemonNameJa('bulbasaur')).toBe('フシギダネ');
    expect(getPokemonNameJa('pikachu')).toBe('ピカチュウ');
  });

  it('リージョン・ギラティナのフォームを日本語で区別する', () => {
    expect(getPokemonNameJa('vulpix_alolan')).toBe(
      'ロコン（アローラのすがた）',
    );
    expect(getPokemonNameJa('giratina_altered')).toBe(
      'ギラティナ（アナザーフォルム）',
    );
    expect(getPokemonNameJa('giratina_origin')).toBe(
      'ギラティナ（オリジンフォルム）',
    );
    expect(getPokemonNameJa('tauros_combat')).toBe(
      'ケンタロス（パルデアのすがた・コンバットしゅ）',
    );
  });

  it('PokeAPIにない確認済み衣装フォームも日本語で表示する', () => {
    expect(getPokemonNameJa('pikachu_flying')).toBe('そらをとぶピカチュウ');
    expect(getPokemonNameJa('pikachu_horizons')).toBe(
      'キャプテン帽子をかぶったピカチュウ',
    );
    expect(getPokemonNameJa('pikachu_kariyushi')).toBe(
      '「かりゆしウェア」を身にまとったピカチュウ',
    );
    expect(getPokemonNameJa('pikachu_shaymin')).toBe(
      '「シェイミ」風スカーフを身につけたピカチュウ',
    );
  });

  it('日本語データ欠損時は英語名へ安全にフォールバックする', () => {
    expect(
      getPokemonDisplayName({
        speciesId: 'unknown_test_species',
        speciesName: 'Unknown Test Species',
      }),
    ).toBe('Unknown Test Species');
  });

  it('イベント文中の英語名を長い名前から安全に置換する', () => {
    expect(replacePokemonNamesInText('Lunala Raid Hour')).toBe(
      'ルナアーラ Raid Hour',
    );
    expect(replacePokemonNamesInText('Mr. Mime Spotlight Hour')).toBe(
      'バリヤード Spotlight Hour',
    );
    expect(replacePokemonNamesInText('Giratina (Altered) Raid Hour')).toBe(
      'ギラティナ（アナザーフォルム） Raid Hour',
    );
  });
});
