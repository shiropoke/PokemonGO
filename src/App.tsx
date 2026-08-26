import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PrimaryNavigation, SideDrawer, SiteHeader } from './components/AppNavigation';
import { GlobalSearchDialog } from './components/GlobalSearchDialog';
import { LegalFooter } from './components/LegalFooter';
import { ContactPage } from './pages/ContactPage';
import { EventsPage } from './pages/EventsPage';
import { EggsPage } from './pages/EggsPage';
import { EvolutionCpPage } from './pages/EvolutionCpPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { IvCheckerPage } from './pages/IvCheckerPage';
import { MoveCheckerPage } from './pages/MoveCheckerPage';
import { PowerUpPage } from './pages/PowerUpPage';
import { PokefutaPage } from './pages/PokefutaPage';
import { PvpRankingsPage } from './pages/PvpRankingsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { RaidsPage } from './pages/RaidsPage';
import { ResearchPage } from './pages/ResearchPage';
import { RocketPage } from './pages/RocketPage';
import { SettingsPage } from './pages/SettingsPage';
import { TermsPage } from './pages/TermsPage';
import { useMainTabSwipe } from './hooks/useMainTabSwipe';
import {
  resolveInitialTabPosition,
  saveTabPosition,
} from './services/tabPosition';
import type { TabPosition } from './services/tabPosition';
import {
  applyTheme,
  readStoredTheme,
  resolveInitialTheme,
  saveTheme,
} from './services/theme';
import type { Theme } from './services/theme';
import { getHashQueryParam, getPageFromHash, getPageHash, getPageTitle } from './types/navigation';
import type { NavigationQuery, Page } from './types/navigation';
import {
  getMainTabTransitionDirection,
  type MainTabTransitionDirection,
} from './utils/mainTabTransition';
import { scrollPageToTop, shouldResetPageScroll } from './utils/navigationScroll';

const PAGE_TRANSITION_FALLBACK_MS = 360;

interface PageTransition {
  id: number;
  from: Page;
  to: Page;
  direction: MainTabTransitionDirection;
  scrollOffset: number;
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type NavigateHandler = (page: Page, query?: NavigationQuery) => void;

interface SettingsStateProps {
  tabPosition: TabPosition;
  onTabPositionChange(position: TabPosition): void;
  theme: Theme;
  onThemeChange(theme: Theme): void;
}

function renderPage(
  page: Page,
  onNavigate: NavigateHandler,
  settingsState: SettingsStateProps,
) {
  switch (page) {
    case 'home': return <HomePage onNavigate={onNavigate} />;
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
    case 'pokefuta': return (
      <PokefutaPage
        prefectureSlug={getHashQueryParam(window.location.hash, 'pref')}
        onNavigate={onNavigate}
      />
    );
    case 'favorites': return <FavoritesPage onNavigate={onNavigate} />;
    case 'settings': return <SettingsPage {...settingsState} />;
    case 'terms': return <TermsPage />;
    case 'privacy': return <PrivacyPolicyPage />;
    case 'contact': return <ContactPage onNavigate={onNavigate} />;
  }
}

function PageContent({
  page,
  onNavigate,
  ...settingsState
}: {
  page: Page;
  onNavigate: NavigateHandler;
} & SettingsStateProps) {
  return (
    <div className="page-content-frame">
      {renderPage(page, onNavigate, settingsState)}
      <LegalFooter onNavigate={onNavigate} />
    </div>
  );
}

export default function App() {
  const initialPage = getPageFromHash(window.location.hash);
  const [page, setPage] = useState<Page>(initialPage);
  const [visiblePage, setVisiblePage] = useState<Page>(initialPage);
  const [pageTransition, setPageTransition] = useState<PageTransition | null>(null);
  const [navigationSequence, setNavigationSequence] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const siteHeaderRef = useRef<HTMLElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const pageSwipeSurfaceRef = useRef<HTMLElement>(null);
  const transitionSequenceRef = useRef(0);
  const pageTransitionRef = useRef<PageTransition | null>(null);
  const pendingScrollResetRef = useRef(
    shouldResetPageScroll(initialPage, window.location.hash),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme(
      getStorage(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );
  const [tabPosition, setTabPosition] = useState<TabPosition>(() =>
    resolveInitialTabPosition(getStorage()),
  );

  useEffect(() => {
    const onHashChange = () => {
      const nextPage = getPageFromHash(window.location.hash);
      pendingScrollResetRef.current = shouldResetPageScroll(
        nextPage,
        window.location.hash,
      );
      setPage(nextPage);
      setNavigationSequence((sequence) => sequence + 1);
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
      scrollOffset: Math.max(
        0,
        window.scrollY,
        document.documentElement.scrollTop,
        document.body.scrollTop,
      ),
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

  useLayoutEffect(() => {
    if (
      !pendingScrollResetRef.current
      || (!pageTransition && page !== visiblePage)
    ) {
      return;
    }

    pendingScrollResetRef.current = false;
    scrollPageToTop();
  }, [navigationSequence, page, pageTransition, visiblePage]);

  useEffect(() => {
    document.title = getPageTitle(page);
  }, [page]);

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
    pendingScrollResetRef.current = shouldResetPageScroll(nextPage, nextHash);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setPage(nextPage);
      setNavigationSequence((sequence) => sequence + 1);
    }
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme, getStorage());
  };

  const changeTabPosition = (nextPosition: TabPosition) => {
    setTabPosition(nextPosition);
    saveTabPosition(nextPosition, getStorage());
  };

  const navigationPage = pageTransition?.to ?? visiblePage;
  const activeContentPage = pageTransition?.to ?? visiblePage;
  const mainTabSwipeHandlers = useMainTabSwipe({
    currentPage: visiblePage,
    disabled:
      isMenuOpen
      || isSearchOpen
      || pageTransition !== null
      || page !== visiblePage,
    surfaceRef: pageSwipeSurfaceRef,
    onNavigate: navigate,
  });

  return (
    <div className="app-shell" data-tab-position={tabPosition}>
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
          ref={pageSwipeSurfaceRef}
          id="main-content"
          className={`main-content main-tab-swipe-surface page-transition-viewport${pageTransition ? ' is-transitioning' : ''}`}
          {...mainTabSwipeHandlers}
        >
          <>
            {pageTransition ? (
              <div
                key={pageTransition.from}
                className={`page-transition-layer page-transition-layer--outgoing page-transition-layer--${pageTransition.direction}`}
                aria-hidden="true"
              >
                <div
                  className="page-transition-scroll-preserver"
                  style={{
                    transform: `translate3d(0, -${pageTransition.scrollOffset}px, 0)`,
                  }}
                >
                  <PageContent
                    page={pageTransition.from}
                    onNavigate={navigate}
                    tabPosition={tabPosition}
                    onTabPositionChange={changeTabPosition}
                    theme={theme}
                    onThemeChange={changeTheme}
                  />
                </div>
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
              <PageContent
                page={activeContentPage}
                onNavigate={navigate}
                tabPosition={tabPosition}
                onTabPositionChange={changeTabPosition}
                theme={theme}
                onThemeChange={changeTheme}
              />
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
