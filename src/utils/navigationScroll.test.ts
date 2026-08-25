import { describe, expect, it, vi } from 'vitest';
import {
  hasNavigationTarget,
  scrollPageToTop,
  shouldResetPageScroll,
} from './navigationScroll';

describe('navigation scroll', () => {
  it('通常遷移はホーム・イベント・レイド・同一ページを含めて先頭へ戻す', () => {
    expect(shouldResetPageScroll('events', '#/events')).toBe(true);
    expect(shouldResetPageScroll('raids', '#/raids')).toBe(true);
    expect(shouldResetPageScroll('home', '#/home')).toBe(true);
    expect(shouldResetPageScroll('terms', '#/terms')).toBe(true);
  });

  it('検索ターゲット付きイベント・レイド遷移は対象スクロールへ委ねる', () => {
    expect(hasNavigationTarget('events', '#/events?event=go-fest')).toBe(true);
    expect(hasNavigationTarget('raids', '#/raids?raid=raid-pikachu-0')).toBe(true);
    expect(shouldResetPageScroll('events', '#/events?event=go-fest')).toBe(false);
    expect(shouldResetPageScroll('raids', '#/raids?raid=raid-pikachu-0')).toBe(false);
    expect(shouldResetPageScroll('events', '#/events?other=value')).toBe(true);
  });

  it('windowとSafari向けscrolling rootを即時に0へ戻す', () => {
    const scrollTo = vi.fn();
    const scrollingDocument = {
      documentElement: { scrollTop: 420 },
      body: { scrollTop: 380 },
    };

    scrollPageToTop({ scrollTo }, scrollingDocument);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(scrollingDocument.documentElement.scrollTop).toBe(0);
    expect(scrollingDocument.body.scrollTop).toBe(0);
  });

  it('scrollToが利用できない環境でもfallbackを適用する', () => {
    const scrollingDocument = {
      documentElement: { scrollTop: 80 },
      body: { scrollTop: 50 },
    };

    scrollPageToTop(
      { scrollTo: () => { throw new Error('unsupported'); } },
      scrollingDocument,
    );

    expect(scrollingDocument.documentElement.scrollTop).toBe(0);
    expect(scrollingDocument.body.scrollTop).toBe(0);
  });
});
