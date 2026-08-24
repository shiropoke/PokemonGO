export interface VisualViewportMetrics {
  /** レイアウトビューポート下端のうち、仮想キーボード等で隠れる高さ。 */
  keyboardInset: number;
}

export function resolveVisualViewportMetrics(
  viewport: Pick<VisualViewport, 'height' | 'offsetTop'> | null | undefined,
  layoutViewportHeight: number,
): VisualViewportMetrics {
  const layoutHeight = Number.isFinite(layoutViewportHeight)
    ? Math.max(0, layoutViewportHeight)
    : 0;
  if (!viewport || !Number.isFinite(viewport.height) || viewport.height <= 0) {
    return { keyboardInset: 0 };
  }

  const offsetTop = Number.isFinite(viewport.offsetTop)
    ? Math.max(0, viewport.offsetTop)
    : 0;
  const visualBottom = viewport.height + offsetTop;

  return {
    keyboardInset: Math.max(0, layoutHeight - visualBottom),
  };
}
