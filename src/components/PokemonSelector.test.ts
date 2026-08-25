import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PokemonSelector, resolvePickerViewportMetrics } from './PokemonSelector';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ポケモン選択モーダルの表示領域', () => {
  it('VisualViewportはモーダル高ではなくキーボード下余白の算出に使う', () => {
    expect(
      resolvePickerViewportMetrics({ height: 412.5, offsetTop: 86 }, 844),
    ).toEqual({ keyboardInset: 345.5 });
  });

  it('VisualViewport未対応時は余白を追加しない', () => {
    expect(resolvePickerViewportMetrics(undefined, 667)).toEqual({ keyboardInset: 0 });
  });

  it('idleHintがnullなら補助文と空のsmall要素を表示しない', () => {
    vi.stubGlobal('window', { innerHeight: 844, visualViewport: undefined });
    const markup = renderToStaticMarkup(createElement(PokemonSelector, {
      pokemon: [],
      selectedPokemon: null,
      loading: false,
      onSelect: () => undefined,
      onRetry: () => undefined,
      idleHint: null,
    }));

    expect(markup).not.toContain('名前で検索できます');
    expect(markup).not.toContain('<small></small>');
  });
});
