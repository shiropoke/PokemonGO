import { describe, expect, it } from 'vitest';
import {
  getTypeLabelJa,
  isLikelyUntranslatedResearchText,
  localizeExternalPokemonName,
  localizeResearchText,
  resolveExternalPokemonSpeciesId,
  stripExternalMarkup,
} from './scrapedDuckLocalization';

describe('ScrapedDuck表示の日本語化', () => {
  it('既存の日本語辞書で通常種と地域フォームを解決する', () => {
    expect(localizeExternalPokemonName('Bulbasaur')).toBe('フシギダネ');
    expect(localizeExternalPokemonName('Galarian Mr. Mime')).toBe(
      'バリヤード（ガラルのすがた）',
    );
    expect(resolveExternalPokemonSpeciesId('Galarian Mr. Mime')).toBe(
      'mr_mime_galarian',
    );
  });

  it('フォームとシャドウの順序を既存speciesIdへ合わせる', () => {
    expect(localizeExternalPokemonName('Shadow Giratina (Altered)')).toBe(
      'ギラティナ（アナザーフォルム）（シャドウ）',
    );
    expect(resolveExternalPokemonSpeciesId('Shadow Giratina (Altered)')).toBe(
      'giratina_altered_shadow',
    );
  });

  it('辞書にないフォーム名は通常種へ統合せず表示に残す', () => {
    expect(localizeExternalPokemonName('Basculin (White Striped)')).toBe(
      'バスラオ（White Striped）',
    );
    expect(resolveExternalPokemonSpeciesId('Basculin (White Striped)')).toBeNull();
  });

  it('HTMLを描画せず定型リサーチを日本語化する', () => {
    expect(stripExternalMarkup('<span>Catch 3 Nickit</span>')).toBe(
      'Catch 3 Nickit',
    );
    expect(localizeResearchText('<span>Catch 3 Nickit</span>')).toBe(
      'クスネを3匹捕まえる',
    );
    expect(localizeResearchText('<span>Make 5 Nice Throws</span>')).toBe(
      'ナイススローを5回投げる',
    );
  });

  it('未知の固有文は安全に英語へフォールバックする', () => {
    expect(localizeResearchText('<span>Unknown seasonal instruction</span>')).toBe(
      'Unknown seasonal instruction',
    );
    expect(isLikelyUntranslatedResearchText('Unknown seasonal instruction')).toBe(true);
  });

  it.each([
    ['Catch 7 Pokémon', 'ポケモンを7匹捕まえる'],
    ['Catch a Dragon-type Pokémon', 'ドラゴンタイプのポケモンを1匹捕まえる'],
    ['Catch 7 different species of Pokémon', 'ポケモンを7種類捕まえる'],
    ['Make 10 Curveball Throws', 'カーブボールを10回投げる'],
    ['Make 5 Great Curveball Throws in a row', 'カーブボールのグレートスローを5回連続で投げる'],
    ['Win a raid', 'レイドバトルで1回勝つ'],
    ['Win a three-star raid or higher', 'レベル3以上のレイドに1回勝つ'],
    ['Win 5 raids', 'レイドバトルで5回勝つ'],
    ['Explore 2 km', '2km 探索する'],
    ['Hatch an Egg', 'タマゴを1個かえす'],
    ['Hatch 2 Eggs', 'タマゴを2個かえす'],
    ['Spin 3 PokéStops or Gyms', 'ポケストップ・ジム3個を回す'],
    ['Take a snapshot of a wild Pokémon', '野生ポケモンのGOスナップショット写真を撮る'],
    ['Evolve a Pokémon', 'ポケモンを1匹進化させる'],
    ['Power up Pokémon 3 times', 'ポケモンを3回強化する'],
    ['Earn 2 Candies walking with your buddy', '相棒と歩いてアメを2個もらう'],
    ['Send 3 Gifts and add a sticker to each', 'ステッカー付きのギフトを3個贈る'],
    ['Trade a Pokémon', 'ポケモンを交換する'],
    ['Defeat a Team GO Rocket Grunt', 'GOロケット団したっぱとのバトルで1回勝つ'],
  ])('%sをPokeMinersの日本語テンプレートへ対応させる', (english, japanese) => {
    expect(localizeResearchText(english)).toBe(japanese);
    expect(isLikelyUntranslatedResearchText(english)).toBe(false);
  });

  it('外部タイプ名を大文字小文字に依存せず共通日本語名へ変換する', () => {
    expect(getTypeLabelJa(' WATER ')).toBe('みず');
    expect(getTypeLabelJa('stellar')).toBe('stellar');
  });
});
