import type { Page } from '../types/navigation';
import { getAdjacentMainTab } from './mainTabTransition';

export type SwipeDirectionLock = 'pending' | 'horizontal' | 'vertical';

export const SWIPE_DIRECTION_LOCK_DISTANCE = 12;
export const SWIPE_HORIZONTAL_RATIO = 1.5;
export const SWIPE_MIN_DISTANCE = 60;
export const SWIPE_VIEWPORT_RATIO = 0.16;
export const SWIPE_MAX_VERTICAL_DISTANCE = 50;
export const SWIPE_EDGE_EXCLUSION = 24;

const SWIPE_EXCLUDED_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  'summary',
  'details',
  '[role="button"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-main-tab-swipe-ignore]',
  '[data-horizontal-scroll]',
  '.week-calendar-scroll',
  '.picker-backdrop',
  '.global-search-backdrop',
  '.drawer-layer',
].join(', ');

interface ClosestTarget {
  closest(selectors: string): unknown;
}

function hasClosest(target: EventTarget | null): target is EventTarget & ClosestTarget {
  return Boolean(
    target
    && typeof (target as Partial<ClosestTarget>).closest === 'function',
  );
}

export function isSwipeStartTargetExcluded(target: EventTarget | null): boolean {
  return hasClosest(target) && Boolean(target.closest(SWIPE_EXCLUDED_SELECTOR));
}

export function isInsideScrollableHorizontalRegion(
  target: EventTarget | null,
  boundary: HTMLElement | null,
): boolean {
  if (!hasClosest(target) || typeof Element === 'undefined' || !(target instanceof Element)) {
    return false;
  }

  let element: Element | null = target;
  while (element && element !== boundary) {
    if (element instanceof HTMLElement && element.scrollWidth > element.clientWidth) {
      const view = element.ownerDocument.defaultView;
      const overflowX = view?.getComputedStyle(element).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function resolveSwipeDirectionLock(
  currentLock: SwipeDirectionLock,
  dx: number,
  dy: number,
): SwipeDirectionLock {
  if (currentLock !== 'pending') return currentLock;

  const absoluteX = Math.abs(dx);
  const absoluteY = Math.abs(dy);
  if (Math.max(absoluteX, absoluteY) < SWIPE_DIRECTION_LOCK_DISTANCE) {
    return 'pending';
  }
  if (absoluteY >= SWIPE_DIRECTION_LOCK_DISTANCE && absoluteY > absoluteX) {
    return 'vertical';
  }
  if (absoluteX >= SWIPE_DIRECTION_LOCK_DISTANCE && absoluteX > absoluteY * SWIPE_HORIZONTAL_RATIO) {
    return 'horizontal';
  }
  return 'pending';
}

export function isWithinSwipeEdgeExclusion(
  startX: number,
  viewportWidth: number,
): boolean {
  return startX <= SWIPE_EDGE_EXCLUSION
    || startX >= viewportWidth - SWIPE_EDGE_EXCLUSION;
}

interface MainTabSwipeTargetOptions {
  currentPage: Page;
  directionLock: SwipeDirectionLock;
  dx: number;
  dy: number;
  viewportWidth: number;
}

export function getMainTabSwipeTarget({
  currentPage,
  directionLock,
  dx,
  dy,
  viewportWidth,
}: MainTabSwipeTargetOptions): Page | null {
  if (directionLock !== 'horizontal') return null;
  if (Math.abs(dy) > SWIPE_MAX_VERTICAL_DISTANCE) return null;

  const threshold = Math.max(SWIPE_MIN_DISTANCE, viewportWidth * SWIPE_VIEWPORT_RATIO);
  if (Math.abs(dx) < threshold) return null;

  return getAdjacentMainTab(currentPage, dx < 0 ? 1 : -1);
}
