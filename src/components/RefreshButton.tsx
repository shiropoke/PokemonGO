interface RefreshButtonProps {
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void | Promise<void>;
}

export function reloadCurrentPage(): void {
  if (typeof window === 'undefined') return;

  if (typeof document !== 'undefined') {
    const activeElement = document.activeElement as { blur?: () => void } | null;
    activeElement?.blur?.();
  }

  const reload = () => window.location.reload();
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(reload);
  } else {
    reload();
  }
}

export function RefreshButton({
  className,
  disabled = false,
  loading = false,
  onClick,
}: RefreshButtonProps) {
  const classes = ['refresh-button', className].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      type="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={onClick ? () => void onClick() : reloadCurrentPage}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M20 11a8 8 0 1 0-2.34 5.66" />
        <path d="M20 4v7h-7" />
      </svg>
      <span>{loading ? '更新中' : '更新'}</span>
    </button>
  );
}
