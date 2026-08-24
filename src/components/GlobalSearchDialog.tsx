import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { loadEvents } from '../services/events';
import { fetchPokemonData } from '../services/pokemonData';
import { loadRaids } from '../services/scrapedDuck';
import type { ScrapedDuckEvent } from '../types/events';
import type { NavigationQuery, Page } from '../types/navigation';
import type { Pokemon } from '../types/pokemon';
import type { RaidBoss } from '../types/scrapedDuck';
import {
  normalizeSearchText,
  searchGlobalData,
  type GlobalSearchResult,
} from '../utils/search';
import { openIvCheckerForSpecies } from '../utils/toolNavigation';
import {
  resolveVisualViewportMetrics,
  type VisualViewportMetrics,
} from '../utils/visualViewport';

const MAX_RESULTS_PER_GROUP = 8;
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type SearchViewportStyle = CSSProperties & {
  '--search-keyboard-inset': string;
};

interface SearchDataState {
  pokemon: Pokemon[];
  events: ScrapedDuckEvent[];
  raids: RaidBoss[];
  loaded: boolean;
  loading: boolean;
  failed: string[];
}

interface GlobalSearchDialogProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement>;
  onClose(): void;
  onNavigate(page: Page, query?: NavigationQuery): void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  );
}

function ResultChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SearchResultGroup({
  title,
  results,
  onSelect,
}: {
  title: string;
  results: readonly GlobalSearchResult[];
  onSelect(result: GlobalSearchResult): void;
}) {
  if (results.length === 0) return null;
  const visible = results.slice(0, MAX_RESULTS_PER_GROUP);

  return (
    <section className="global-search-group">
      <h3>{title}</h3>
      <div className="global-search-group__list">
        {visible.map((result) => (
          <button
            key={result.id}
            type="button"
            className="global-search-result"
            onClick={() => onSelect(result)}
          >
            <span>
              <strong>{result.title}</strong>
              <small>{result.subtitle}</small>
            </span>
            <ResultChevron />
          </button>
        ))}
      </div>
      {results.length > visible.length ? (
        <p className="global-search-group__more">
          他{(results.length - visible.length).toLocaleString('ja-JP')}件。検索語を追加して絞り込めます。
        </p>
      ) : null}
    </section>
  );
}

export function GlobalSearchDialog({
  open,
  triggerRef,
  onClose,
  onNavigate,
}: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [data, setData] = useState<SearchDataState>({
    pokemon: [],
    events: [],
    raids: [],
    loaded: false,
    loading: false,
    failed: [],
  });
  const [viewportMetrics, setViewportMetrics] = useState<VisualViewportMetrics>(
    () => resolveVisualViewportMetrics(window.visualViewport, window.innerHeight),
  );
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const layoutViewportHeightRef = useRef(window.innerHeight);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);
  const requestedVersionRef = useRef(-1);
  const pendingNavigationRef = useRef(false);
  const restoreFocusRef = useRef(true);

  const closeDialog = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    inputRef.current?.blur();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (
      !open ||
      loadingRef.current ||
      requestedVersionRef.current === requestVersion ||
      (loadedRef.current && requestVersion === 0)
    ) {
      return undefined;
    }

    loadingRef.current = true;
    requestedVersionRef.current = requestVersion;
    setData((current) => ({ ...current, loading: true, failed: [] }));
    void Promise.allSettled([fetchPokemonData(), loadEvents(), loadRaids()]).then(
      ([pokemonResult, eventsResult, raidsResult]) => {
        loadingRef.current = false;
        const failed = [
          pokemonResult.status === 'rejected' ? 'Pokémon' : null,
          eventsResult.status === 'rejected' ? 'イベント' : null,
          raidsResult.status === 'rejected' ? 'レイド' : null,
        ].filter((label): label is string => label !== null);
        loadedRef.current = true;
        setData((current) => ({
          pokemon:
            pokemonResult.status === 'fulfilled'
              ? pokemonResult.value.pokemon
              : current.pokemon,
          events:
            eventsResult.status === 'fulfilled'
              ? eventsResult.value.events
              : current.events,
          raids:
            raidsResult.status === 'fulfilled'
              ? raidsResult.value.data
              : current.raids,
          loaded: true,
          loading: false,
          failed,
        }));
      },
    );

    return undefined;
  }, [open, requestVersion]);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocusRef.current = true;
    pendingNavigationRef.current = false;
    setQuery('');
    layoutViewportHeightRef.current = window.innerHeight;
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const next = resolveVisualViewportMetrics(
        visualViewport,
        layoutViewportHeightRef.current,
      );
      setViewportMetrics((current) =>
        current.keyboardInset === next.keyboardInset
          ? current
          : next,
      );
    };
    updateViewport();
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    const lockedScrollX = window.scrollX;
    const lockedScrollY = window.scrollY;
    const useFixedBodyLock = window.matchMedia('(max-width: 680px)').matches;
    const bodyStyle = document.body.style;
    const previousBodyStyle = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      width: bodyStyle.width,
      overflow: bodyStyle.overflow,
    };
    bodyStyle.overflow = 'hidden';
    if (useFixedBodyLock) {
      bodyStyle.position = 'fixed';
      bodyStyle.top = `-${lockedScrollY}px`;
      bodyStyle.left = `-${lockedScrollX}px`;
      bodyStyle.width = '100%';
    }

    const focusTimer = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
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
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      bodyStyle.position = previousBodyStyle.position;
      bodyStyle.top = previousBodyStyle.top;
      bodyStyle.left = previousBodyStyle.left;
      bodyStyle.width = previousBodyStyle.width;
      bodyStyle.overflow = previousBodyStyle.overflow;
      window.scrollTo(
        pendingNavigationRef.current ? 0 : lockedScrollX,
        pendingNavigationRef.current ? 0 : lockedScrollY,
      );
      if (restoreFocusRef.current && !pendingNavigationRef.current) {
        window.setTimeout(
          () => triggerRef.current?.focus({ preventScroll: true }),
          0,
        );
      }
      pendingNavigationRef.current = false;
    };
  }, [closeDialog, open, triggerRef]);

  const results = useMemo(
    () => searchGlobalData(data, query),
    [data, query],
  );
  const resultCount =
    results.pokemon.length +
    results.events.length +
    results.raids.length +
    results.pages.length;
  const hasQuery = normalizeSearchText(query).length > 0;

  const selectResult = (result: GlobalSearchResult) => {
    pendingNavigationRef.current = true;
    closeDialog(false);
    if (result.kind === 'pokemon') {
      openIvCheckerForSpecies(result.speciesId);
    } else if (result.kind === 'event') {
      onNavigate('events', { event: result.eventID });
    } else if (result.kind === 'raid') {
      onNavigate('raids', { raid: result.raidId });
    } else {
      onNavigate(result.page);
    }
  };

  if (!open) return null;

  const viewportStyle: SearchViewportStyle = {
    '--search-keyboard-inset': `${viewportMetrics.keyboardInset}px`,
  };

  return (
    <div
      className="global-search-backdrop"
      style={viewportStyle}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeDialog();
      }}
    >
      <section
        ref={dialogRef}
        id="global-search-dialog"
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
      >
        <header className="global-search-dialog__header">
          <h2 id="global-search-title">サイト内検索</h2>
          <button
            type="button"
            className="global-search-close"
            aria-label="検索を閉じる"
            onClick={() => closeDialog()}
          >
            <CloseIcon />
          </button>
        </header>

        <label className="global-search-input">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (resultsRef.current) resultsRef.current.scrollTop = 0;
            }}
            placeholder="ポケモン・イベント・レイド・機能を検索"
            aria-label="サイト内の情報を検索"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <div
          ref={resultsRef}
          className="global-search-results"
          aria-live="polite"
          aria-busy={data.loading}
        >
          {hasQuery ? (
            <p className="global-search-results__heading">
              {resultCount.toLocaleString('ja-JP')}件の候補
            </p>
          ) : null}

          {data.loading ? (
            <p className="global-search-state">検索データを読み込んでいます</p>
          ) : null}
          {data.failed.length > 0 ? (
            <div className="global-search-notice" role="status">
              <span>{data.failed.join('・')}の情報を取得できませんでした。</span>
              <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
                再試行
              </button>
            </div>
          ) : null}

          <SearchResultGroup title="Pokémon" results={results.pokemon} onSelect={selectResult} />
          <SearchResultGroup title="イベント" results={results.events} onSelect={selectResult} />
          <SearchResultGroup title="レイド" results={results.raids} onSelect={selectResult} />
          <SearchResultGroup
            title={hasQuery ? 'ページ・ツール' : 'よく使う機能'}
            results={results.pages}
            onSelect={selectResult}
          />

          {hasQuery && !data.loading && resultCount === 0 ? (
            <p className="global-search-empty">該当する情報が見つかりません</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
