import type { Page } from '../types/navigation';

export const MAIN_TABS = ['home', 'events', 'raids', 'iv'] as const satisfies readonly Page[];

export type MainTabPage = (typeof MAIN_TABS)[number];

export const MAIN_TAB_ORDER = Object.fromEntries(MAIN_TABS.map((page, index) => [page, index])) as Record<MainTabPage, number>;

export type MainTabTransitionDirection = 'right' | 'left';

/**
 * Returns the physical tab-order direction for transitions between the four
 * primary pages. Non-primary routes deliberately do not animate.
 */
export function getMainTabTransitionDirection(
  from: Page,
  to: Page,
  mainTabs: readonly Page[] = MAIN_TABS,
): MainTabTransitionDirection | null {
  const fromIndex = mainTabs.indexOf(from);
  const toIndex = mainTabs.indexOf(to);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null;
  }

  return toIndex > fromIndex ? 'right' : 'left';
}

export function getAdjacentMainTab(
  current: Page,
  offset: -1 | 1,
  mainTabs: readonly Page[] = MAIN_TABS,
): Page | null {
  const currentIndex = mainTabs.indexOf(current);
  if (currentIndex < 0) return null;
  return mainTabs[currentIndex + offset] ?? null;
}
