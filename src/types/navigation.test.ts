import { describe, expect, it } from 'vitest';
import {
  getHashQueryParam,
  getPageFromHash,
  getPageHash,
  getPageTitle,
} from './navigation';

describe('hash navigation', () => {
  it('GitHub Pagesで再読込可能なhashを生成・解析する', () => {
    expect(getPageHash('pvp-rankings')).toBe('#/pvp-rankings');
    expect(getPageFromHash('#/pvp-rankings')).toBe('pvp-rankings');
    expect(getPageFromHash('#/iv-checker?species=pikachu')).toBe('iv');
    expect(getPageFromHash('#/events?event=go-fest')).toBe('events');
    expect(getPageFromHash('#/raids?raid=raid-pikachu-0')).toBe('raids');
  });

  it('queryを安全に生成・取得する', () => {
    const hash = getPageHash('events', { event: 'event name/2026' });
    expect(hash).toBe('#/events?event=event+name%2F2026');
    expect(getHashQueryParam(hash, 'event')).toBe('event name/2026');
    expect(getHashQueryParam(hash, 'missing')).toBeNull();
  });

  it('利用規約とプライバシーポリシーのhashを生成・解析する', () => {
    expect(getPageHash('terms')).toBe('#/terms');
    expect(getPageFromHash('#/terms')).toBe('terms');
    expect(getPageHash('privacy')).toBe('#/privacy');
    expect(getPageFromHash('#/privacy')).toBe('privacy');
    expect(getPageTitle('terms')).toBe('利用規約 | GO Scope');
    expect(getPageTitle('privacy')).toBe(
      'プライバシーポリシー | GO Scope',
    );
  });

  it('お問い合わせのhashとtitleを生成・解析する', () => {
    expect(getPageHash('contact')).toBe('#/contact');
    expect(getPageFromHash('#/contact')).toBe('contact');
    expect(getPageTitle('contact')).toBe('お問い合わせ | GO Scope');
  });

  it('ポケふたのhash・query・titleを生成・解析する', () => {
    expect(getPageHash('pokefuta')).toBe('#/pokefuta');
    expect(getPageHash('pokefuta', { pref: 'osaka' })).toBe('#/pokefuta?pref=osaka');
    expect(getPageFromHash('#/pokefuta?pref=osaka')).toBe('pokefuta');
    expect(getPageTitle('pokefuta')).toBe('ポケふた | GO Scope');
  });

  it('空または未知のhashはホームへ戻す', () => {
    expect(getPageFromHash('')).toBe('home');
    expect(getPageFromHash('#/unknown')).toBe('home');
  });
});
