import { useEffect, useState } from 'react';
import { EventsPage } from './pages/EventsPage';
import { IvCheckerPage } from './pages/IvCheckerPage';

type Page = 'events' | 'iv';

function getPageFromHash(): Page {
  return window.location.hash === '#/iv-checker' ? 'iv' : 'events';
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v3m10-3v3M4.5 9h15M5 5.5h14a1 1 0 0 1 1 1V20H4V6.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4.2 18a9 9 0 1 1 15.6 0M12 12l4-4M7.5 18h9" />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', '#/events');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (nextPage: Page) => {
    window.location.hash = nextPage === 'events' ? '#/events' : '#/iv-checker';
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#/events" aria-label="Pokémon GO Information ホーム">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>
            <strong>Pokémon GO</strong>
            <small>Information</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          <button className={page === 'events' ? 'is-active' : ''} onClick={() => navigate('events')}>
            <CalendarIcon />イベント
          </button>
          <button className={page === 'iv' ? 'is-active' : ''} onClick={() => navigate('iv')}>
            <GaugeIcon />個体値チェッカー
          </button>
        </nav>
      </header>

      <main id="main-content" className="main-content">
        {page === 'events' ? <EventsPage /> : <IvCheckerPage />}
      </main>

      <nav className="bottom-nav" aria-label="メインナビゲーション">
        <button className={page === 'events' ? 'is-active' : ''} onClick={() => navigate('events')} aria-current={page === 'events' ? 'page' : undefined}>
          <CalendarIcon /><span>イベント</span>
        </button>
        <button className={page === 'iv' ? 'is-active' : ''} onClick={() => navigate('iv')} aria-current={page === 'iv' ? 'page' : undefined}>
          <GaugeIcon /><span>個体値チェッカー</span>
        </button>
      </nav>
    </div>
  );
}
