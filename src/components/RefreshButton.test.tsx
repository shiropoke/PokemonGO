import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RefreshButton, reloadCurrentPage } from './RefreshButton';

describe('RefreshButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('更新SVGと日本語ラベルを持つ送信しないボタンを表示する', () => {
    const markup = renderToStaticMarkup(<RefreshButton />);

    expect(markup).toContain('class="refresh-button"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('<svg');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('<span>更新</span>');
    expect(markup).not.toContain('再取得');
    expect(markup).not.toContain('更新確認');
  });

  it('押下処理で現在のページをリロードする', () => {
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });

    reloadCurrentPage();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
