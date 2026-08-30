import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import raidMenuIcon from '../assets/navigation/raid-menu-icon.png';
import { getSitePageDefinition, OTHER_LINKS, TOOL_LINKS } from '../constants/sitePages';
import type { NavigationQuery, Page } from '../types/navigation';
import { getPageHash } from '../types/navigation';

type IconName = 'home' | 'calendar' | 'raid' | 'tools' | 'more';

interface NavigationProps {
  current: Page;
  onNavigate(page: Page, query?: NavigationQuery): void;
}

interface SiteHeaderProps extends NavigationProps {
  headerRef: RefObject<HTMLElement>;
  menuButtonRef: RefObject<HTMLButtonElement>;
  menuOpen: boolean;
  onMenuToggle(): void;
  searchButtonRef: RefObject<HTMLButtonElement>;
  searchOpen: boolean;
  onSearchOpen(): void;
  onRefresh(): void;
  onSettingsToggle(): void;
}

interface SideDrawerProps extends NavigationProps {
  menuButtonRef: RefObject<HTMLButtonElement>;
  open: boolean;
  onClose(): void;
}

function NavIcon({ name }: { name: IconName }) {
  if (name === 'raid') {
    const raidIconStyle: CSSProperties = {
      WebkitMaskImage: `url("${raidMenuIcon}")`,
      maskImage: `url("${raidMenuIcon}")`,
    };

    return (
      <span
        className="navigation-icon navigation-icon--raid"
        style={raidIconStyle}
        aria-hidden="true"
      />
    );
  }

  const paths: Record<Exclude<IconName, 'raid'>, ReactNode> = {
    home: <path d="m3.5 11 8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />,
    calendar: <path d="M7 3v3m10-3v3M4.5 9h15M5 5.5h14a1 1 0 0 1 1-1V20H4V6.5a1 1 0 0 1 1-1Z" />,
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
        <strong>GO Scope</strong>
      </span>
    </span>
  );
}

export function SiteHeader({
  current,
  headerRef,
  menuButtonRef,
  menuOpen,
  onMenuToggle,
  onNavigate,
  searchButtonRef,
  searchOpen,
  onSearchOpen,
  onRefresh,
  onSettingsToggle,
}: SiteHeaderProps) {
  return (
    <header
      ref={headerRef}
      className="site-header shell-header"
      aria-hidden={searchOpen || undefined}
    >
      <div className="shell-header__inner">
        <button
          ref={menuButtonRef}
          className={`menu-trigger${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={menuOpen}
          aria-controls="site-side-drawer"
          onClick={onMenuToggle}
        >
          <span className="menu-trigger__icon" aria-hidden="true">
            <span className="menu-trigger__line" />
            <span className="menu-trigger__line" />
            <span className="menu-trigger__line" />
          </span>
        </button>

        <a
          className="shell-header__brand-link"
          href={getPageHash('home')}
          aria-label="GO Scope ホーム"
          aria-current={current === 'home' ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            onNavigate('home');
          }}
        >
          <Brand compact />
        </a>

        <div className="shell-header__actions">
          <button
            className="site-refresh-trigger"
            type="button"
            aria-label="サイトを更新"
            onClick={onRefresh}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M20 11a8 8 0 1 0-2.34 5.66" />
              <path d="M20 4v7h-7" />
            </svg>
          </button>
          <button
            ref={searchButtonRef}
            className="site-search-trigger"
            type="button"
            aria-label="サイト内を検索"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            aria-controls="global-search-dialog"
            onClick={onSearchOpen}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 4 4" />
            </svg>
          </button>
          <a
            className={`site-settings-trigger${current === 'settings' ? ' is-active' : ''}`}
            href={getPageHash('settings')}
            aria-label="設定"
            aria-current={current === 'settings' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              onSettingsToggle();
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M9.6 3.5h4.8l.6 2.2 1.9 1.1 2.2-.7 2.4 4.2-1.6 1.7v2l1.6 1.7-2.4 4.2-2.2-.7-1.9 1.1-.6 2.2H9.6L9 20.3l-1.9-1.1-2.2.7-2.4-4.2L4.1 14v-2l-1.6-1.7 2.4-4.2 2.2.7L9 5.7l.6-2.2Z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </a>
        </div>
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
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [scrollLocked, setScrollLocked] = useState(false);
  const navigationPendingRef = useRef(false);
  const pendingNavigationRef = useRef<Page | null>(null);

  useEffect(() => {
    if (open) {
      setScrollLocked(true);
      const focusTimer = window.setTimeout(
        () => drawerRef.current
          ?.querySelector<HTMLElement>(focusableSelector)
          ?.focus({ preventScroll: true }),
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

    body.classList.add('is-drawer-scroll-locked');

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
      body.classList.remove('is-drawer-scroll-locked');
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
      const drawerFocusable = drawer
        ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
        : [];
      const trigger = menuButtonRef.current;
      const firstDrawerItem = drawerFocusable.at(0);
      const lastDrawerItem = drawerFocusable.at(-1);
      if (!trigger || !firstDrawerItem || !lastDrawerItem) return;

      if (event.shiftKey && document.activeElement === firstDrawerItem) {
        event.preventDefault();
        trigger.focus();
      } else if (event.shiftKey && document.activeElement === trigger) {
        event.preventDefault();
        lastDrawerItem.focus();
      } else if (!event.shiftKey && document.activeElement === trigger) {
        event.preventDefault();
        firstDrawerItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastDrawerItem) {
        event.preventDefault();
        trigger.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuButtonRef, onClose, open]);

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
          ref={drawerRef}
          id="site-side-drawer"
          className="side-drawer"
          role="dialog"
          aria-label="サイトメニュー"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === 'transform' && !open) {
              finishClose();
            }
          }}
        >
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

        </aside>
      </div>
  );
}

export function PrimaryNavigation({
  current,
  mainTabs,
  onNavigate,
}: NavigationProps & { mainTabs: readonly Page[] }) {
  return (
    <div className="primary-navigation-shell" data-main-tab-swipe-ignore>
      <nav className="primary-navigation" aria-label="主要ページ">
        {mainTabs.map((page) => {
          const item = getSitePageDefinition(page);
          if (!item) return null;
          return (
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
          );
        })}
      </nav>
    </div>
  );
}
