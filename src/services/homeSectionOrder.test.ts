import { describe, expect, it, vi } from 'vitest';
import { APP_LOCAL_STORAGE_KEYS, HOME_SECTION_ORDER_STORAGE_KEY } from './appStorage';
import {
  HOME_SECTION_IDS,
  moveHomeSection,
  moveHomeSectionToIndex,
  resolveInitialHomeSectionOrder,
  saveHomeSectionOrder,
} from './homeSectionOrder';

function storageWith(value: string | null) {
  return { getItem: vi.fn(() => value), setItem: vi.fn() };
}

describe('home section order preferences', () => {
  it('uses the current six-section order without storage', () => {
    expect(resolveInitialHomeSectionOrder(storageWith(null))).toEqual([
      'featured', 'limited-today', 'ongoing', 'weekly', 'raids', 'favorites',
    ]);
  });

  it('restores a valid saved order and saves changes', () => {
    const order = ['favorites', 'raids', 'weekly', 'ongoing', 'limited-today', 'featured'] as const;
    expect(resolveInitialHomeSectionOrder(storageWith(JSON.stringify(order)))).toEqual(order);
    const storage = storageWith(null);
    saveHomeSectionOrder(order, storage);
    expect(storage.setItem).toHaveBeenCalledWith(HOME_SECTION_ORDER_STORAGE_KEY, JSON.stringify(order));
  });

  it.each([
    'not-json',
    JSON.stringify(['featured', 'featured', 'ongoing', 'weekly', 'raids', 'favorites']),
    JSON.stringify(['featured', 'ongoing', 'weekly', 'raids', 'favorites']),
    JSON.stringify(['featured', 'limited-today', 'ongoing', 'weekly', 'raids', 'unknown']),
  ])('falls back for malformed, duplicate, incomplete, or unknown data', (value) => {
    expect(resolveInitialHomeSectionOrder(storageWith(value))).toEqual([
      'featured', 'limited-today', 'ongoing', 'weekly', 'raids', 'favorites',
    ]);
  });

  it('changes only the display order until the caller saves it', () => {
    expect(moveHomeSection(
      ['featured', 'limited-today', 'ongoing', 'weekly', 'raids', 'favorites'],
      'favorites',
      'ongoing',
    )).toEqual(['featured', 'limited-today', 'favorites', 'ongoing', 'weekly', 'raids']);
  });

  it.each([
    ['featured', 5, ['limited-today', 'ongoing', 'weekly', 'raids', 'favorites', 'featured']],
    ['favorites', 0, ['favorites', 'featured', 'limited-today', 'ongoing', 'weekly', 'raids']],
    ['limited-today', 4, ['featured', 'ongoing', 'weekly', 'raids', 'limited-today', 'favorites']],
    ['raids', 1, ['featured', 'raids', 'limited-today', 'ongoing', 'weekly', 'favorites']],
  ] as const)('moves %s directly to destination index %i', (source, destinationIndex, expected) => {
    expect(moveHomeSectionToIndex(
      ['featured', 'limited-today', 'ongoing', 'weekly', 'raids', 'favorites'],
      source,
      destinationIndex,
    )).toEqual(expected);
  });

  it('registers the preference as app-owned storage', () => {
    expect(APP_LOCAL_STORAGE_KEYS).toContain(HOME_SECTION_ORDER_STORAGE_KEY);
  });

  it('keeps the edit control outside the six persisted sections', () => {
    expect(HOME_SECTION_IDS).toHaveLength(6);
    expect(HOME_SECTION_IDS as readonly string[]).not.toContain('home-section-order-edit');
  });
});
