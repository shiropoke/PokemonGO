import { describe, expect, it } from 'vitest';
import {
  APP_LOCAL_STORAGE_KEYS,
  clearAppLocalStorage,
  FAVORITES_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './appStorage';

class TestStorage {
  readonly values = new Map<string, string>();
  readonly removed: string[] = [];
  failOn: string | null = null;

  removeItem(key: string): void {
    if (key === this.failOn) throw new Error('storage unavailable');
    this.removed.push(key);
    this.values.delete(key);
  }
}

describe('app local storage', () => {
  it('このサイトが所有する明示的なキーだけを削除する', () => {
    const storage = new TestStorage();
    storage.values.set(THEME_STORAGE_KEY, 'dark');
    storage.values.set(FAVORITES_STORAGE_KEY, '["pikachu"]');
    storage.values.set('unrelated-app:data', 'keep');

    const result = clearAppLocalStorage(storage);

    expect(result).toEqual({ success: true, failedKeys: [] });
    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(FAVORITES_STORAGE_KEY)).toBe(false);
    expect(storage.values.get('unrelated-app:data')).toBe('keep');
    expect(storage.removed).toEqual([...APP_LOCAL_STORAGE_KEYS]);
  });

  it('storage例外を投げず、削除できなかったキーを返す', () => {
    const storage = new TestStorage();
    storage.failOn = FAVORITES_STORAGE_KEY;

    expect(clearAppLocalStorage(storage)).toEqual({
      success: false,
      failedKeys: [FAVORITES_STORAGE_KEY],
    });
  });

  it('storageへアクセスできない場合もクラッシュしない', () => {
    const result = clearAppLocalStorage(null);
    expect(result.success).toBe(false);
    expect(result.failedKeys).toEqual([...APP_LOCAL_STORAGE_KEYS]);
  });
});
