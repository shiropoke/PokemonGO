interface RefreshButtonProps {
  className?: string;
}

const TEMPORARY_VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';

export function reloadCurrentPage(): void {
  if (typeof window === 'undefined') return;

  if (typeof document !== 'undefined') {
    const activeElement = document.activeElement as { blur?: () => void } | null;
    activeElement?.blur?.();

    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    viewportMeta?.setAttribute('content', TEMPORARY_VIEWPORT_CONTENT);
  }

  const reload = () => window.location.reload();
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(reload);
  } else {
    reload();
  }
}

export function RefreshButton({ className }: RefreshButtonProps) {
  const classes = ['refresh-button', className].filter(Boolean).join(' ');

  return (
    <button className={classes} type="button" onClick={reloadCurrentPage}>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M20 11a8 8 0 1 0-2.34 5.66" />
        <path d="M20 4v7h-7" />
      </svg>
      <span>更新</span>
    </button>
  );
}
