import { describe, expect, it, vi } from 'vitest';
import {
  readStoredTheme,
  resolveInitialTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from './theme';

function storageWith(value: string | null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe('theme preferences', () => {
  it('保存済みテーマを端末設定より優先する', () => {
    expect(resolveInitialTheme(storageWith('light'), true)).toBe('light');
    expect(resolveInitialTheme(storageWith('dark'), false)).toBe('dark');
  });

  it('未保存時は端末設定へフォールバックする', () => {
    expect(resolveInitialTheme(storageWith(null), true)).toBe('dark');
    expect(resolveInitialTheme(storageWith(null), false)).toBe('light');
  });

  it('light / darkだけを保存・復元する', () => {
    const storage = storageWith('unexpected');
    expect(readStoredTheme(storage)).toBeNull();
    saveTheme('dark', storage);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
  });
});
