import { describe, expect, it } from 'vitest';
import {
  getTypeLabelJa,
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
      'クスネを3匹つかまえる',
    );
    expect(localizeResearchText('<span>Make 5 Nice Throws</span>')).toBe(
      'ナイススローを5回投げる',
    );
  });

  it('未知の固有文は安全に英語へフォールバックする', () => {
    expect(localizeResearchText('<span>Unknown seasonal instruction</span>')).toBe(
      'Unknown seasonal instruction',
    );
  });

  it('外部タイプ名を大文字小文字に依存せず共通日本語名へ変換する', () => {
    expect(getTypeLabelJa(' WATER ')).toBe('みず');
    expect(getTypeLabelJa('stellar')).toBe('stellar');
  });
});
