import { TAB_POSITION_STORAGE_KEY } from './appStorage';

export type TabPosition = 'top' | 'bottom';

export { TAB_POSITION_STORAGE_KEY };

export interface TabPositionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isTabPosition(value: unknown): value is TabPosition {
  return value === 'top' || value === 'bottom';
}

export function readStoredTabPosition(
  storage?: TabPositionStorage | null,
): TabPosition | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(TAB_POSITION_STORAGE_KEY);
    return isTabPosition(value) ? value : null;
  } catch {
    return null;
  }
}

export function resolveInitialTabPosition(
  storage?: TabPositionStorage | null,
): TabPosition {
  return readStoredTabPosition(storage) ?? 'top';
}

export function saveTabPosition(
  position: TabPosition,
  storage?: TabPositionStorage | null,
): void {
  if (!storage) return;

  try {
    storage.setItem(TAB_POSITION_STORAGE_KEY, position);
  } catch {
    // Storage restrictions must not prevent the in-memory setting from changing.
  }
}
