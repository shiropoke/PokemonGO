import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PrimaryNavigation, SideDrawer, SiteHeader } from './components/AppNavigation';
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
import type { Page } from './types/navigation';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function renderPage(page: Page, homeNavigation?: ReactNode) {
  switch (page) {
    case 'home': return <HomePage navigation={homeNavigation} />;
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
  const [page, setPage] = useState<Page>(() => getPageFromHash(window.location.hash));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
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
    };
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', getPageHash('home'));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    pageContentRef.current?.toggleAttribute('inert', isMenuOpen);
  }, [isMenuOpen]);

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

  const navigate = useCallback((nextPage: Page) => {
    window.location.hash = getPageHash(nextPage);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme, getStorage());
  };

  const primaryNavigation = (
    <PrimaryNavigation current={page} onNavigate={navigate} />
  );

  return (
    <div className="app-shell">
      <div
        ref={pageContentRef}
        className="page-shell-content"
        aria-hidden={isMenuOpen || undefined}
      >
        <SiteHeader
          current={page}
          menuButtonRef={menuButtonRef}
          menuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen((open) => !open)}
          onNavigate={navigate}
        />

        {page === 'home' ? null : primaryNavigation}

        <main id="main-content" className="main-content">
          {renderPage(page, page === 'home' ? primaryNavigation : undefined)}
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
    </div>
  );
}
