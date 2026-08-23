import type { Page } from '../types/navigation';

export const MAIN_TAB_ORDER = {
  home: 0,
  events: 1,
  raids: 2,
  iv: 3,
} as const satisfies Partial<Record<Page, number>>;

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
