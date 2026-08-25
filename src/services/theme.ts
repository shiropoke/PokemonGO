import { THEME_STORAGE_KEY } from './appStorage';

export type Theme = 'light' | 'dark';

export { THEME_STORAGE_KEY };

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function readStoredTheme(storage?: ThemeStorage | null): Theme | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function resolveInitialTheme(
  storage: ThemeStorage | null | undefined,
  prefersDark: boolean,
): Theme {
  return readStoredTheme(storage) ?? (prefersDark ? 'dark' : 'light');
}

export function saveTheme(theme: Theme, storage?: ThemeStorage | null): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Safari private browsing and storage quotas must not block theme changes.
  }
}

export function applyTheme(theme: Theme, documentNode: Document = document): void {
  documentNode.documentElement.dataset.theme = theme;
  documentNode.documentElement.style.colorScheme = theme;

  const themeColor = documentNode.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  themeColor?.setAttribute('content', theme === 'dark' ? '#141414' : '#1769aa');

  const colorScheme = documentNode.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  );
  colorScheme?.setAttribute('content', theme);
}
