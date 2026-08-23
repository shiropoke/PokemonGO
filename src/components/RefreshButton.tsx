interface RefreshButtonProps {
  className?: string;
}

export function reloadCurrentPage(): void {
  window.location.reload();
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
