import { describe, expect, it } from 'vitest';
import { resolvePickerViewportMetrics } from './PokemonSelector';

describe('ポケモン選択モーダルの表示領域', () => {
  it('VisualViewportはモーダル高ではなくキーボード下余白の算出に使う', () => {
    expect(
      resolvePickerViewportMetrics({ height: 412.5, offsetTop: 86 }, 844),
    ).toEqual({ keyboardInset: 345.5 });
  });

  it('VisualViewport未対応時は余白を追加しない', () => {
    expect(resolvePickerViewportMetrics(undefined, 667)).toEqual({ keyboardInset: 0 });
  });
});
