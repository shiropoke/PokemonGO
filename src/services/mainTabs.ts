import { SITE_PAGES } from '../constants/sitePages';
import type { Page } from '../types/navigation';
import { MAIN_TABS_STORAGE_KEY } from './appStorage';

export const DEFAULT_MAIN_TABS = ['home', 'events', 'raids', 'iv'] as const satisfies readonly Page[];

export type MainTabs = readonly [Page, Page, Page, Page];

export interface MainTabsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const excludedMainTabPages = new Set<Page>(['home', 'settings', 'terms', 'privacy', 'contact']);

export function getMainTabCandidates(): readonly Page[] {
  return SITE_PAGES
    .map(({ page }) => page)
    .filter((page) => !excludedMainTabPages.has(page));
}

export function isMainTabs(value: unknown): value is MainTabs {
  if (!Array.isArray(value) || value.length !== 4 || value[0] !== 'home') return false;

  const selectable = new Set(getMainTabCandidates());
  return new Set(value).size === 4
    && value.slice(1).every((page) => typeof page === 'string' && selectable.has(page as Page));
}

export function readStoredMainTabs(storage?: MainTabsStorage | null): MainTabs | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(MAIN_TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isMainTabs(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveInitialMainTabs(storage?: MainTabsStorage | null): MainTabs {
  return readStoredMainTabs(storage) ?? DEFAULT_MAIN_TABS;
}

export function saveMainTabs(tabs: MainTabs, storage?: MainTabsStorage | null): void {
  if (!storage || !isMainTabs(tabs)) return;

  try {
    storage.setItem(MAIN_TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // Storage restrictions must not prevent the in-memory setting from changing.
  }
}
