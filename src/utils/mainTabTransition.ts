import type { Page } from '../types/navigation';

export const MAIN_TABS = ['home', 'events', 'raids', 'iv'] as const satisfies readonly Page[];

export type MainTabPage = (typeof MAIN_TABS)[number];

export const MAIN_TAB_ORDER = Object.fromEntries(
  MAIN_TABS.map((page, index) => [page, index]),
) as Record<MainTabPage, number>;

export type MainTabTransitionDirection = 'right' | 'left';

/**
 * Returns the physical tab-order direction for transitions between the four
 * primary pages. Non-primary routes deliberately do not animate.
 */
export function getMainTabTransitionDirection(
  from: Page,
  to: Page,
): MainTabTransitionDirection | null {
  const fromIndex = MAIN_TAB_ORDER[from as keyof typeof MAIN_TAB_ORDER];
  const toIndex = MAIN_TAB_ORDER[to as keyof typeof MAIN_TAB_ORDER];

  if (fromIndex === undefined || toIndex === undefined || fromIndex === toIndex) {
    return null;
  }

  return toIndex > fromIndex ? 'right' : 'left';
}

export function getAdjacentMainTab(
  current: Page,
  offset: -1 | 1,
): MainTabPage | null {
  const currentIndex = MAIN_TAB_ORDER[current as MainTabPage];
  if (currentIndex === undefined) return null;
  return MAIN_TABS[currentIndex + offset] ?? null;
}
