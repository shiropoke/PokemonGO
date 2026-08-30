import { describe, expect, it, vi } from 'vitest';
import { APP_LOCAL_STORAGE_KEYS, MAIN_TABS_STORAGE_KEY } from './appStorage';
import {
  resolveInitialMainTabs,
  saveMainTabs,
} from './mainTabs';

function storageWith(value: string | null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe('main tab preferences', () => {
  it('uses the default order when nothing is stored', () => {
    expect(resolveInitialMainTabs(storageWith(null))).toEqual(['home', 'events', 'raids', 'iv']);
  });

  it('restores a valid saved order', () => {
    expect(resolveInitialMainTabs(storageWith(JSON.stringify(['home', 'research', 'rocket', 'pvp-rankings']))))
      .toEqual(['home', 'research', 'rocket', 'pvp-rankings']);
  });

  it.each([
    'not-json',
    JSON.stringify(['events', 'home', 'raids', 'iv']),
    JSON.stringify(['home', 'events', 'events', 'iv']),
    JSON.stringify(['home', 'settings', 'raids', 'iv']),
  ])('falls back for invalid stored data', (value) => {
    expect(resolveInitialMainTabs(storageWith(value))).toEqual(['home', 'events', 'raids', 'iv']);
  });

  it('saves valid settings and registers its app-owned key', () => {
    const storage = storageWith(null);
    saveMainTabs(['home', 'eggs', 'rocket', 'favorites'], storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      MAIN_TABS_STORAGE_KEY,
      JSON.stringify(['home', 'eggs', 'rocket', 'favorites']),
    );
    expect(APP_LOCAL_STORAGE_KEYS).toContain(MAIN_TABS_STORAGE_KEY);
  });
});
