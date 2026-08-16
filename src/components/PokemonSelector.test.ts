import { describe, expect, it } from 'vitest';
import { resolvePickerViewportMetrics } from './PokemonSelector';

describe('Pokémon選択モーダルの表示領域', () => {
  it('VisualViewportの実表示高と上端位置を優先する', () => {
    expect(
      resolvePickerViewportMetrics({ height: 412.5, offsetTop: 86 }, 844),
    ).toEqual({ height: 412.5, offsetTop: 86 });
  });

  it('VisualViewport未対応時はinnerHeightへフォールバックする', () => {
    expect(resolvePickerViewportMetrics(undefined, 667)).toEqual({
      height: 667,
      offsetTop: 0,
    });
  });
});
