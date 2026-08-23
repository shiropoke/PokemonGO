export interface VisualViewportMetrics {
  height: number;
  offsetTop: number;
}

export function resolveVisualViewportMetrics(
  viewport: Pick<VisualViewport, 'height' | 'offsetTop'> | null | undefined,
  fallbackHeight: number,
): VisualViewportMetrics {
  const fallback = Number.isFinite(fallbackHeight)
    ? Math.max(0, fallbackHeight)
    : 0;
  const height =
    viewport && Number.isFinite(viewport.height) && viewport.height > 0
      ? viewport.height
      : fallback;
  const offsetTop =
    viewport && Number.isFinite(viewport.offsetTop)
      ? Math.max(0, viewport.offsetTop)
      : 0;

  return { height, offsetTop };
}

