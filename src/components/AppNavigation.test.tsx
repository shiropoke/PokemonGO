import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PrimaryNavigation, SCROLL_TO_TOP_THRESHOLD, SideDrawer, SiteHeader } from './AppNavigation';

describe('SiteHeader', () => {
  it('上部へ戻る、更新、検索、設定の順にアイコン操作を表示し、設定ページではactiveにする', () => {
    const markup = renderToStaticMarkup(
      <SiteHeader
        current="settings"
        headerRef={createRef<HTMLElement>()}
        menuButtonRef={createRef<HTMLButtonElement>()}
        menuOpen={false}
        onMenuToggle={vi.fn()}
        onNavigate={vi.fn()}
        searchButtonRef={createRef<HTMLButtonElement>()}
        searchOpen={false}
        onSearchOpen={vi.fn()}
        onRefresh={vi.fn()}
        onSettingsToggle={vi.fn()}
      />,
    );

    const scrollTopIndex = markup.indexOf('aria-label="ページ上部へ戻る"');
    const refreshIndex = markup.indexOf('aria-label="サイトを更新"');
    const searchIndex = markup.indexOf('aria-label="サイト内を検索"');
    const settingsIndex = markup.indexOf('aria-label="設定"');
    expect(scrollTopIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(scrollTopIndex);
    expect(searchIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeGreaterThan(refreshIndex);
    expect(settingsIndex).toBeGreaterThan(searchIndex);
    expect(markup).toContain('href="#/settings"');
    expect(markup).toContain('aria-current="page"');
  });

  it('uses a 240px scroll threshold for the page-top action', () => {
    expect(SCROLL_TO_TOP_THRESHOLD).toBe(240);
  });
});

describe('SideDrawer', () => {
  it('ナビゲーションを維持しつつ設定UIを表示しない', () => {
    const markup = renderToStaticMarkup(
      <SideDrawer
        current="home"
        menuButtonRef={createRef<HTMLButtonElement>()}
        open
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="サイトメニュー"');
    expect(markup).toContain('ポケふた');
    expect(markup).not.toContain('タブ位置');
    expect(markup).not.toContain('ダークモード');
    expect(markup).not.toContain('サイトの共有');
    expect(markup).not.toContain('保存データの削除');
  });
});

describe('PrimaryNavigation', () => {
  it('renders the configured four-tab order', () => {
    const markup = renderToStaticMarkup(
      <PrimaryNavigation
        current="rocket"
        mainTabs={['home', 'research', 'rocket', 'pvp-rankings']}
        onNavigate={vi.fn()}
      />,
    );

    expect(markup.indexOf('ホーム')).toBeLessThan(markup.indexOf('フィールドリサーチ'));
    expect(markup.indexOf('フィールドリサーチ')).toBeLessThan(markup.indexOf('GOロケット団'));
    expect(markup.indexOf('GOロケット団')).toBeLessThan(markup.indexOf('PvPランキング'));
  });
});
