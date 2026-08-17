import { describe, expect, it } from 'vitest';
import { formatMoveId } from './toolNavigation';

describe('formatMoveId', () => {
  it('PvPokeの技IDを読みやすい英語名へ整形する', () => {
    expect(formatMoveId('THUNDER_SHOCK')).toBe('Thunder Shock');
    expect(formatMoveId('WILD_CHARGE')).toBe('Wild Charge');
  });
});
