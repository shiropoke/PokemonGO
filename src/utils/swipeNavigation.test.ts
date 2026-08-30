import { describe, expect, it } from 'vitest';
import {
  getMainTabSwipeTarget,
  isMultiTouchSwipeBlocked,
  isSwipeStartTargetExcluded,
  isWithinSwipeEdgeExclusion,
  resolveSwipeDirectionLock,
} from './swipeNavigation';

function targetMatching(selectorFragment: string | null): EventTarget {
  return {
    closest: (selectors: string) => (
      selectorFragment && selectors.includes(selectorFragment) ? {} : null
    ),
  } as unknown as EventTarget;
}

describe('main tab swipe navigation', () => {
  it('moves to the next tab after a clear left swipe', () => {
    expect(getMainTabSwipeTarget({
      currentPage: 'home',
      directionLock: resolveSwipeDirectionLock('pending', -100, 10),
      dx: -100,
      dy: 10,
      viewportWidth: 390,
    })).toBe('events');
  });

  it('uses the configured tab order for swipe targets', () => {
    expect(getMainTabSwipeTarget({
      currentPage: 'research',
      mainTabs: ['home', 'research', 'rocket', 'pvp-rankings'],
      directionLock: 'horizontal',
      dx: -100,
      dy: 10,
      viewportWidth: 390,
    })).toBe('rocket');
  });

  it('moves to the previous tab after a clear right swipe', () => {
    expect(getMainTabSwipeTarget({
      currentPage: 'raids',
      directionLock: resolveSwipeDirectionLock('pending', 100, 10),
      dx: 100,
      dy: 10,
      viewportWidth: 390,
    })).toBe('events');
  });

  it.each([
    { dx: 20, dy: 150, label: 'vertical scrolling' },
    { dx: 70, dy: 60, label: 'diagonal movement' },
    { dx: 30, dy: 5, label: 'short horizontal movement' },
  ])('does not navigate for $label', ({ dx, dy }) => {
    const directionLock = resolveSwipeDirectionLock('pending', dx, dy);
    expect(getMainTabSwipeTarget({
      currentPage: 'events',
      directionLock,
      dx,
      dy,
      viewportWidth: 390,
    })).toBeNull();
  });

  it('keeps a gesture vertically locked after later sideways movement', () => {
    const locked = resolveSwipeDirectionLock('pending', 8, 20);
    expect(locked).toBe('vertical');
    expect(resolveSwipeDirectionLock(locked, 100, 25)).toBe('vertical');
  });

  it('does not wrap past the first or last tab', () => {
    expect(getMainTabSwipeTarget({
      currentPage: 'home',
      directionLock: 'horizontal',
      dx: 100,
      dy: 5,
      viewportWidth: 390,
    })).toBeNull();
    expect(getMainTabSwipeTarget({
      currentPage: 'iv',
      directionLock: 'horizontal',
      dx: -100,
      dy: 5,
      viewportWidth: 390,
    })).toBeNull();
  });

  it('excludes interactive controls and horizontal-scroll regions at gesture start', () => {
    expect(isSwipeStartTargetExcluded(targetMatching('button'))).toBe(true);
    expect(isSwipeStartTargetExcluded(targetMatching('input'))).toBe(true);
    expect(isSwipeStartTargetExcluded(targetMatching('[data-main-tab-swipe-ignore]'))).toBe(true);
    expect(isSwipeStartTargetExcluded(targetMatching('.week-calendar-scroll'))).toBe(true);
    expect(isSwipeStartTargetExcluded(targetMatching('[data-horizontal-scroll]'))).toBe(true);
    expect(isSwipeStartTargetExcluded(targetMatching(null))).toBe(false);
  });

  it('1本指は許可し、2本指または非primary pointerではタブスワイプを止める', () => {
    expect(isMultiTouchSwipeBlocked(true, 1)).toBe(false);
    expect(isMultiTouchSwipeBlocked(true, 2)).toBe(true);
    expect(isMultiTouchSwipeBlocked(false, 2)).toBe(true);
  });

  it('preserves iOS browser gestures at both viewport edges', () => {
    expect(isWithinSwipeEdgeExclusion(20, 390)).toBe(true);
    expect(isWithinSwipeEdgeExclusion(370, 390)).toBe(true);
    expect(isWithinSwipeEdgeExclusion(100, 390)).toBe(false);
  });
});
