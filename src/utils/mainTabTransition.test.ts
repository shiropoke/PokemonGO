import { describe, expect, it } from 'vitest';
import {
  MAIN_TAB_ORDER,
  getMainTabTransitionDirection,
} from './mainTabTransition';

describe('main tab transition direction', () => {
  it('keeps the requested primary-tab order', () => {
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
});
