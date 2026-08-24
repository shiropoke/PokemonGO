import { useCallback, useEffect, useRef, useState } from 'react';
import { PrimaryNavigation, SideDrawer, SiteHeader } from './components/AppNavigation';
import { GlobalSearchDialog } from './components/GlobalSearchDialog';
import { EventsPage } from './pages/EventsPage';
import { EggsPage } from './pages/EggsPage';
import { EvolutionCpPage } from './pages/EvolutionCpPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { IvCheckerPage } from './pages/IvCheckerPage';
import { MoveCheckerPage } from './pages/MoveCheckerPage';
import { PowerUpPage } from './pages/PowerUpPage';
import { PvpRankingsPage } from './pages/PvpRankingsPage';
import { RaidsPage } from './pages/RaidsPage';
import { ResearchPage } from './pages/ResearchPage';
import { RocketPage } from './pages/RocketPage';
import {
  applyTheme,
  readStoredTheme,
  resolveInitialTheme,
  saveTheme,
} from './services/theme';
import type { Theme } from './services/theme';
import { getPageFromHash, getPageHash } from './types/navigation';
import type { NavigationQuery, Page } from './types/navigation';
import {
  getMainTabTransitionDirection,
  type MainTabTransitionDirection,
} from './utils/mainTabTransition';

const PAGE_TRANSITION_FALLBACK_MS = 360;

interface PageTransition {
  id: number;
  from: Page;
  to: Page;
  direction: MainTabTransitionDirection;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function renderPage(page: Page) {
  switch (page) {
    case 'home': return <HomePage />;
    case 'events': return <EventsPage />;
    case 'raids': return <RaidsPage />;
    case 'iv': return <IvCheckerPage />;
    case 'evolution': return <EvolutionCpPage />;
    case 'power-up': return <PowerUpPage />;
    case 'moves': return <MoveCheckerPage />;
    case 'pvp-rankings': return <PvpRankingsPage />;
    case 'research': return <ResearchPage />;
    case 'eggs': return <EggsPage />;
    case 'rocket': return <RocketPage />;
    case 'favorites': return <FavoritesPage />;
  }
}

export default function App() {
  const initialPage = getPageFromHash(window.location.hash);
  const [page, setPage] = useState<Page>(initialPage);
  const [visiblePage, setVisiblePage] = useState<Page>(initialPage);
  const [pageTransition, setPageTransition] = useState<PageTransition | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const siteHeaderRef = useRef<HTMLElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const transitionSequenceRef = useRef(0);
  const pageTransitionRef = useRef<PageTransition | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme(
      getStorage(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );

  useEffect(() => {
    const onHashChange = () => {
      setPage(getPageFromHash(window.location.hash));
      setIsMenuOpen(false);
      setIsSearchOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', getPageHash('home'));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (pageTransition || page === visiblePage) return;

    const direction = getMainTabTransitionDirection(visiblePage, page);
    if (!direction) {
      setVisiblePage(page);
      return;
    }

    transitionSequenceRef.current += 1;
    const nextTransition = {
      id: transitionSequenceRef.current,
      from: visiblePage,
      to: page,
      direction,
    } satisfies PageTransition;
    pageTransitionRef.current = nextTransition;
    setPageTransition(nextTransition);
  }, [page, pageTransition, visiblePage]);

  const finishPageTransition = useCallback((transitionId: number) => {
    const current = pageTransitionRef.current;
    if (!current || current.id !== transitionId) return;
    pageTransitionRef.current = null;
    setVisiblePage(current.to);
    setPageTransition(null);
  }, []);

  useEffect(() => {
    if (!pageTransition) return undefined;
    const fallbackTimer = window.setTimeout(
      () => finishPageTransition(pageTransition.id),
      PAGE_TRANSITION_FALLBACK_MS,
    );
    return () => window.clearTimeout(fallbackTimer);
  }, [finishPageTransition, pageTransition]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    siteHeaderRef.current?.toggleAttribute('inert', isSearchOpen);
    pageContentRef.current?.toggleAttribute('inert', isMenuOpen || isSearchOpen);
  }, [isMenuOpen, isSearchOpen]);

  useEffect(() => {
    if (readStoredTheme(getStorage())) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystemTheme = (event: MediaQueryListEvent) => {
      if (readStoredTheme(getStorage())) return;
      setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', followSystemTheme);
    return () => media.removeEventListener('change', followSystemTheme);
  }, []);

  const navigate = useCallback((nextPage: Page, query?: NavigationQuery) => {
    const nextHash = getPageHash(nextPage, query);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setPage(nextPage);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme, getStorage());
  };

  const navigationPage = pageTransition?.to ?? visiblePage;
  const activeContentPage = pageTransition?.to ?? visiblePage;

  return (
    <div className="app-shell">
      <SiteHeader
        current={page}
        headerRef={siteHeaderRef}
        menuButtonRef={menuButtonRef}
        menuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen((open) => !open)}
        onNavigate={navigate}
        searchButtonRef={searchButtonRef}
        searchOpen={isSearchOpen}
        onSearchOpen={() => {
          setIsMenuOpen(false);
          setIsSearchOpen(true);
        }}
      />

      <div
        ref={pageContentRef}
        className="page-shell-content"
        aria-hidden={isMenuOpen || isSearchOpen || undefined}
      >
        <PrimaryNavigation current={navigationPage} onNavigate={navigate} />

        <main
          id="main-content"
          className={`main-content page-transition-viewport${pageTransition ? ' is-transitioning' : ''}`}
        >
          <>
            {pageTransition ? (
              <div
                key={pageTransition.from}
                className={`page-transition-layer page-transition-layer--outgoing page-transition-layer--${pageTransition.direction}`}
                aria-hidden="true"
              >
                {renderPage(pageTransition.from)}
              </div>
            ) : null}
            <div
              key={activeContentPage}
              className={`page-transition-layer${pageTransition ? ` page-transition-layer--incoming page-transition-layer--${pageTransition.direction}` : ''}`}
              onAnimationEnd={pageTransition ? (event) => {
                if (event.target === event.currentTarget) {
                  finishPageTransition(pageTransition.id);
                }
              } : undefined}
            >
              {renderPage(activeContentPage)}
            </div>
          </>
        </main>
      </div>

      <SideDrawer
        current={page}
        menuButtonRef={menuButtonRef}
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={navigate}
        theme={theme}
        onThemeChange={changeTheme}
      />
      <GlobalSearchDialog
        open={isSearchOpen}
        triggerRef={searchButtonRef}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}
