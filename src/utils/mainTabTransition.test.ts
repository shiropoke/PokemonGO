import { describe, expect, it } from 'vitest';
import {
  MAIN_TABS,
  MAIN_TAB_ORDER,
  getAdjacentMainTab,
  getMainTabTransitionDirection,
} from './mainTabTransition';

describe('main tab transition direction', () => {
  it('keeps the requested primary-tab order', () => {
    expect(MAIN_TABS).toEqual(['home', 'events', 'raids', 'iv']);
    expect(MAIN_TAB_ORDER).toEqual({
      home: 0,
      events: 1,
      raids: 2,
      iv: 3,
    });
  });

  it.each([
    ['home', 'iv', 'right'],
    ['events', 'raids', 'right'],
    ['iv', 'events', 'left'],
    ['raids', 'home', 'left'],
  ] as const)('%s -> %s is %s', (from, to, expected) => {
    expect(getMainTabTransitionDirection(from, to)).toBe(expected);
  });

  it('does not animate the same tab or secondary pages', () => {
    expect(getMainTabTransitionDirection('home', 'home')).toBeNull();
    expect(getMainTabTransitionDirection('moves', 'events')).toBeNull();
    expect(getMainTabTransitionDirection('raids', 'favorites')).toBeNull();
  });

  it('returns only an adjacent tab and never wraps at either edge', () => {
    expect(getAdjacentMainTab('events', 1)).toBe('raids');
    expect(getAdjacentMainTab('raids', -1)).toBe('events');
    expect(getAdjacentMainTab('home', -1)).toBeNull();
    expect(getAdjacentMainTab('iv', 1)).toBeNull();
    expect(getAdjacentMainTab('moves', 1)).toBeNull();
  });

  it('uses the configured order for transitions and adjacent tabs', () => {
    const tabs = ['home', 'research', 'rocket', 'pvp-rankings'] as const;
    expect(getMainTabTransitionDirection('research', 'rocket', tabs)).toBe('right');
    expect(getMainTabTransitionDirection('rocket', 'research', tabs)).toBe('left');
    expect(getAdjacentMainTab('research', 1, tabs)).toBe('rocket');
    expect(getAdjacentMainTab('rocket', -1, tabs)).toBe('research');
  });
});
