import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SideDrawer, SiteHeader } from './AppNavigation';

describe('SiteHeader', () => {
  it('検索の直後に設定へのリンクを表示し、設定ページではactiveにする', () => {
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
      />,
    );

    const searchIndex = markup.indexOf('aria-label="サイト内を検索"');
    const settingsIndex = markup.indexOf('aria-label="設定"');
    expect(searchIndex).toBeGreaterThan(-1);
    expect(settingsIndex).toBeGreaterThan(searchIndex);
    expect(markup).toContain('href="#/settings"');
    expect(markup).toContain('aria-current="page"');
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
