import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../services/theme';
import type { Page } from '../types/navigation';
import { getPageHash } from '../types/navigation';

type IconName = 'home' | 'calendar' | 'raid' | 'tools' | 'more';

interface NavigationProps {
  current: Page;
  onNavigate(page: Page): void;
}

interface SiteHeaderProps extends NavigationProps {
  menuButtonRef: RefObject<HTMLButtonElement>;
  menuOpen: boolean;
  onMenuToggle(): void;
}

interface SideDrawerProps extends NavigationProps {
  menuButtonRef: RefObject<HTMLButtonElement>;
  open: boolean;
  onClose(): void;
  theme: Theme;
  onThemeChange(theme: Theme): void;
}

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="m3.5 11 8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />,
    calendar: <path d="M7 3v3m10-3v3M4.5 9h15M5 5.5h14a1 1 0 0 1 1-1V20H4V6.5a1 1 0 0 1 1-1Z" />,
    raid: <path d="M12 3a7.5 7.5 0 1 0 7.5 7.5H12V3Zm2 0v5.5h5.5A7.5 7.5 0 0 0 14 3Z" />,
    tools: <path d="m14.5 5.5 4-2-2 4 3.5 3.5-4 4-3.5-3.5-7 7-2-2 7-7L7 6l4-4 3.5 3.5Z" />,
    more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  };

  return (
    <svg className="navigation-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </svg>
  );
}

function Chevron({ expanded = false }: { expanded?: boolean }) {
  return (
    <svg className={`navigation-chevron${expanded ? ' is-expanded' : ''}`} aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const TOOL_LINKS: { page: Page; label: string }[] = [
  { page: 'iv', label: '個体値チェッカー' },
  { page: 'evolution', label: '進化後CP' },
  { page: 'power-up', label: '強化コスト' },
  { page: 'moves', label: 'わざ性能' },
];

const OTHER_LINKS: { page: Page; label: string }[] = [
  { page: 'pvp-rankings', label: 'PvPランキング' },
  { page: 'research', label: 'フィールドリサーチ' },
  { page: 'eggs', label: 'タマゴ' },
  { page: 'rocket', label: 'GOロケット団' },
  { page: 'favorites', label: 'お気に入り' },
];

const PRIMARY_LINKS: { page: Page; label: string }[] = [
  { page: 'home', label: 'ホーム' },
  { page: 'events', label: 'イベント' },
  { page: 'raids', label: 'レイド' },
  { page: 'iv', label: '個体値チェッカー' },
];

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`shell-brand${compact ? ' shell-brand--compact' : ''}`}>
      <img
        src={`${import.meta.env.BASE_URL}icon-v2-192.png`}
        width={compact ? 32 : 42}
        height={compact ? 32 : 42}
        alt=""
        aria-hidden="true"
      />
      <span className="shell-brand__title">
        <strong>Pokémon GO</strong>
        <small>Information</small>
      </span>
    </span>
  );
}

export function SiteHeader({
  current,
  menuButtonRef,
  menuOpen,
  onMenuToggle,
  onNavigate,
}: SiteHeaderProps) {
  return (
    <header className="site-header shell-header">
      <div className="shell-header__inner">
        <button
          ref={menuButtonRef}
          className="menu-trigger"
          type="button"
          aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={menuOpen}
          aria-controls="site-side-drawer"
          onClick={onMenuToggle}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M4 6.5h16M4 12h16M4 17.5h16" />
          </svg>
        </button>

        <a
          className="shell-header__brand-link"
          href={getPageHash('home')}
          aria-label="Pokémon GO Information ホーム"
          aria-current={current === 'home' ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            onNavigate('home');
          }}
        >
          <Brand compact />
        </a>

      </div>
    </header>
  );
}

function DrawerLink({
  page,
  label,
  icon,
  current,
  onNavigate,
  tabIndex,
}: {
  page: Page;
  label: string;
  icon?: IconName;
  current: Page;
  onNavigate(page: Page): void;
  tabIndex?: number;
}) {
  const active = current === page;
  return (
    <a
      className={`drawer-link${icon ? ' drawer-link--primary' : ' drawer-link--child'}${active ? ' is-active' : ''}`}
      href={getPageHash(page)}
      tabIndex={tabIndex}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(page);
      }}
    >
      {icon ? <NavIcon name={icon} /> : <span className="drawer-link__dot" aria-hidden="true" />}
      <span>{label}</span>
      {icon ? <Chevron /> : null}
    </a>
  );
}

function DrawerGroup({
  id,
  label,
  icon,
  open,
  onToggle,
  links,
  current,
  onNavigate,
}: {
  id: string;
  label: string;
  icon: IconName;
  open: boolean;
  onToggle(): void;
  links: { page: Page; label: string }[];
  current: Page;
  onNavigate(page: Page): void;
}) {
  const active = links.some((item) => item.page === current);
  return (
    <section className={`drawer-group${active ? ' is-active' : ''}`}>
      <button
        className="drawer-group__toggle"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <NavIcon name={icon} />
        <span>{label}</span>
        <Chevron expanded={open} />
      </button>
      <div
        id={id}
        className={`drawer-group__collapse${open ? ' is-open' : ''}`}
        aria-hidden={!open}
      >
        <div>
          <div className="drawer-group__links">
            {links.map((item) => (
              <DrawerLink
                key={item.page}
                {...item}
                current={current}
                onNavigate={onNavigate}
                tabIndex={open ? undefined : -1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SideDrawer({
  current,
  menuButtonRef,
  onClose,
  onNavigate,
  open,
  theme,
  onThemeChange,
}: SideDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [scrollLocked, setScrollLocked] = useState(false);
  const navigationPendingRef = useRef(false);
  const pendingNavigationRef = useRef<Page | null>(null);

  useEffect(() => {
    if (open) {
      setScrollLocked(true);
      const focusTimer = window.setTimeout(
        () => closeButtonRef.current?.focus({ preventScroll: true }),
        20,
      );
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [open]);

  const finishClose = useCallback(() => {
    if (open) return;
    setScrollLocked(false);
    const pendingPage = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    if (pendingPage) {
      onNavigate(pendingPage);
    } else {
      menuButtonRef.current?.focus({ preventScroll: true });
    }
  }, [menuButtonRef, onNavigate, open]);

  useEffect(() => {
    if (open || !scrollLocked) return undefined;
    const fallbackTimer = window.setTimeout(finishClose, 340);
    return () => window.clearTimeout(fallbackTimer);
  }, [finishClose, open, scrollLocked]);

  useEffect(() => {
    if (!scrollLocked) return undefined;
    const body = document.body;
    const scrollY = window.scrollY;
    const viewportGutter = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );
    const previous = {
      position: body.style.position,
      top: body.style.top,
      right: body.style.right,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.right = '0';
    body.style.left = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.paddingRight = `${viewportGutter}px`;

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.right = previous.right;
      body.style.left = previous.left;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, navigationPendingRef.current ? 0 : scrollY);
      root.style.scrollBehavior = previousScrollBehavior;
      navigationPendingRef.current = false;
    };
  }, [scrollLocked]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const drawer = document.getElementById('site-side-drawer');
      const focusable = drawer
        ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
        : [];
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const navigateFromDrawer = (page: Page) => {
    navigationPendingRef.current = true;
    pendingNavigationRef.current = page;
    onClose();
  };

  return (
    <div
      className={`drawer-layer${open ? ' is-open' : ''}`}
      aria-hidden={!open && !scrollLocked}
    >
      <button className="drawer-overlay" type="button" tabIndex={-1} aria-label="メニューを閉じる" onClick={onClose} />
      <aside
        id="site-side-drawer"
        className="side-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="サイトメニュー"
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && !open) {
            finishClose();
          }
        }}
      >
        <header className="side-drawer__header">
          <button ref={closeButtonRef} className="drawer-close" type="button" aria-label="メニューを閉じる" onClick={onClose}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
          <Brand />
        </header>

        <nav className="side-drawer__nav" aria-label="サイトメニュー">
          <DrawerLink page="home" label="ホーム" icon="home" current={current} onNavigate={navigateFromDrawer} />
          <DrawerLink page="events" label="イベント" icon="calendar" current={current} onNavigate={navigateFromDrawer} />
          <DrawerLink page="raids" label="レイド" icon="raid" current={current} onNavigate={navigateFromDrawer} />
          <DrawerGroup
            id="drawer-tools"
            label="ツール"
            icon="tools"
            open={toolsOpen}
            onToggle={() => setToolsOpen((value) => !value)}
            links={TOOL_LINKS}
            current={current}
            onNavigate={navigateFromDrawer}
          />
          <DrawerGroup
            id="drawer-other"
            label="その他"
            icon="more"
            open={otherOpen}
            onToggle={() => setOtherOpen((value) => !value)}
            links={OTHER_LINKS}
            current={current}
            onNavigate={navigateFromDrawer}
          />
        </nav>

        <footer className="side-drawer__footer">
          <ThemeToggle theme={theme} onChange={onThemeChange} />
        </footer>
      </aside>
    </div>
  );
}

export function PrimaryNavigation({ current, onNavigate }: NavigationProps) {
  return (
    <div className="primary-navigation-shell">
      <nav className="primary-navigation" aria-label="主要ページ">
        {PRIMARY_LINKS.map((item) => (
          <a
            key={item.page}
            className={current === item.page ? 'is-active' : ''}
            href={getPageHash(item.page)}
            aria-current={current === item.page ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(item.page);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
