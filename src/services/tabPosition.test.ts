import { describe, expect, it, vi } from 'vitest';
import {
  readStoredTabPosition,
  resolveInitialTabPosition,
  saveTabPosition,
  TAB_POSITION_STORAGE_KEY,
} from './tabPosition';

function storageWith(value: string | null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe('tab position preferences', () => {
  it('保存済みの上部設定を復元する', () => {
    expect(resolveInitialTabPosition(storageWith('top'))).toBe('top');
  });

  it('保存済みの下部設定を復元する', () => {
    expect(resolveInitialTabPosition(storageWith('bottom'))).toBe('bottom');
  });

  it('未保存または不正な値では上部へフォールバックする', () => {
    expect(resolveInitialTabPosition(storageWith(null))).toBe('top');
    expect(resolveInitialTabPosition(storageWith('side'))).toBe('top');
    expect(readStoredTabPosition(storageWith('side'))).toBeNull();
  });

  it('設定変更をlocalStorageへ保存する', () => {
    const storage = storageWith(null);
    saveTabPosition('bottom', storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      TAB_POSITION_STORAGE_KEY,
      'bottom',
    );
  });
});
