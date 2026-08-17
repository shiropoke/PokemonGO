import { describe, expect, it } from 'vitest';
import { getPageFromHash, getPageHash } from './navigation';

describe('hash navigation', () => {
  it('GitHub Pagesで再読込可能なhashを生成・解析する', () => {
    expect(getPageHash('pvp-rankings')).toBe('#/pvp-rankings');
    expect(getPageFromHash('#/pvp-rankings')).toBe('pvp-rankings');
    expect(getPageFromHash('#/iv-checker?species=pikachu')).toBe('iv');
  });

  it('空または未知のhashはホームへ戻す', () => {
    expect(getPageFromHash('')).toBe('home');
    expect(getPageFromHash('#/unknown')).toBe('home');
  });
});
