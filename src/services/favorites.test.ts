import { describe, expect, it, vi } from 'vitest';
import {
  FAVORITES_STORAGE_KEY,
  parseFavorites,
  readFavorites,
  toggleFavorite,
  writeFavorites,
} from './favorites';

describe('favorites', () => {
  it('追加と削除をspeciesIdで行う', () => {
    expect(toggleFavorite([], 'pikachu')).toEqual(['pikachu']);
    expect(toggleFavorite(['pikachu', 'riolu'], 'pikachu')).toEqual(['riolu']);
  });

  it('重複・不正値を除いて永続化する', () => {
    expect(parseFavorites(['Pikachu', 'pikachu', '', null])).toEqual(['pikachu']);
    const storage = { getItem: vi.fn(() => '["pikachu"]'), setItem: vi.fn() };
    expect(readFavorites(storage)).toEqual(['pikachu']);
    expect(writeFavorites(['riolu'], storage)).toEqual(['riolu']);
    expect(storage.setItem).toHaveBeenCalledWith(
      FAVORITES_STORAGE_KEY,
      '["riolu"]',
    );
  });
});
