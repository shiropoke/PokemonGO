import type { Theme } from '../services/theme';

interface ThemeToggleProps {
  theme: Theme;
  onChange(theme: Theme): void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => onChange(nextTheme)}
      aria-label={`${nextTheme === 'dark' ? 'ダーク' : 'ライト'}モードへ切り替え`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        ) : (
          <path d="M20 15.2A8.4 8.4 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
        )}
      </svg>
      <span>{theme === 'dark' ? 'ライト' : 'ダーク'}</span>
    </button>
  );
}
