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
    const blur = vi.fn();
    const setAttribute = vi.fn();
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('document', {
      activeElement: { blur },
      querySelector: vi.fn(() => ({ setAttribute })),
    });
    vi.stubGlobal('window', { location: { reload }, requestAnimationFrame });

    reloadCurrentPage();

    expect(blur).toHaveBeenCalledTimes(1);
    expect(setAttribute).toHaveBeenCalledWith(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
    );
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('viewport metaが存在しなくてもblur後にリロードできる', () => {
    const reload = vi.fn();
    const blur = vi.fn();
    vi.stubGlobal('document', {
      activeElement: { blur },
      querySelector: vi.fn(() => null),
    });
    vi.stubGlobal('window', { location: { reload } });

    expect(() => reloadCurrentPage()).not.toThrow();
    expect(blur).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
