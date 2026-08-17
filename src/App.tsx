import { useEffect, useState } from 'react';
import { DesktopNavigation, MobileNavigation } from './components/AppNavigation';
import { ThemeToggle } from './components/ThemeToggle';
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
  const [page, setPage] = useState<Page>(() => getPageFromHash(window.location.hash));
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme(
      getStorage(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', getPageHash('home'));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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

  const navigate = (nextPage: Page) => {
    window.location.hash = getPageHash(nextPage);
    setPage(nextPage);
    document.querySelectorAll<HTMLDetailsElement>('.desktop-nav details[open]').forEach((details) => details.removeAttribute('open'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme, getStorage());
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={getPageHash('home')} aria-label="Pokémon GO Information ホーム">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span><strong>Pokémon GO</strong><small>Information</small></span>
        </a>
        <div className="site-header__actions">
          <DesktopNavigation current={page} onNavigate={navigate} />
          <ThemeToggle theme={theme} onChange={changeTheme} />
        </div>
      </header>

      <main id="main-content" className="main-content">{renderPage(page)}</main>
      <MobileNavigation current={page} onNavigate={navigate} />
    </div>
  );
}
