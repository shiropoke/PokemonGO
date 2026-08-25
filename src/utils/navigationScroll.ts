import { getHashQueryParam } from '../types/navigation';
import type { Page } from '../types/navigation';

interface ScrollWindow {
  scrollTo(options: ScrollToOptions): void;
}

interface ScrollDocument {
  documentElement: { scrollTop: number };
  body: { scrollTop: number };
}

export function hasNavigationTarget(page: Page, hash: string): boolean {
  if (page === 'events') return getHashQueryParam(hash, 'event') !== null;
  if (page === 'raids') return getHashQueryParam(hash, 'raid') !== null;
  return false;
}

export function shouldResetPageScroll(page: Page, hash: string): boolean {
  return !hasNavigationTarget(page, hash);
}

export function scrollPageToTop(
  targetWindow: ScrollWindow = window,
  targetDocument: ScrollDocument = document,
): void {
  try {
    targetWindow.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    // The scrolling-root fallback below still resets older/restricted WebViews.
  }
  // Older Safari/WebKit versions can retain one of these scrolling roots.
  targetDocument.documentElement.scrollTop = 0;
  targetDocument.body.scrollTop = 0;
}
