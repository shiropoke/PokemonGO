import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import type { Pokemon } from '../types/pokemon';
import { searchPokemon } from '../utils/search';
import {
  resolveVisualViewportMetrics,
  type VisualViewportMetrics,
} from '../utils/visualViewport';
import { FavoriteButton } from './FavoriteButton';

const MAX_VISIBLE_RESULTS = 160;

export type PickerViewportMetrics = VisualViewportMetrics;

type PickerViewportStyle = CSSProperties & {
  '--picker-viewport-height': string;
  '--picker-viewport-offset-top': string;
};

export const resolvePickerViewportMetrics = resolveVisualViewportMetrics;

interface PokemonSelectorProps {
  pokemon: Pokemon[];
  selectedPokemon: Pokemon | null;
  loading: boolean;
  error?: string | null;
  onSelect: (pokemon: Pokemon) => void;
  onRetry: () => void;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PokemonSelector({
  pokemon,
  selectedPokemon,
  loading,
  error,
  onSelect,
  onRetry,
}: PokemonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [viewportMetrics, setViewportMetrics] = useState<PickerViewportMetrics>(
    () => resolvePickerViewportMetrics(window.visualViewport, window.innerHeight),
  );
  const titleId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filteredPokemon = useMemo(() => {
    return searchPokemon(pokemon, query).map(({ pokemon: entry }) => entry);
  }, [pokemon, query]);

  const visiblePokemon = filteredPokemon.slice(0, MAX_VISIBLE_RESULTS);

  const closeSelector = useCallback(() => {
    searchInputRef.current?.blur();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const visualViewport = window.visualViewport;
    const updateViewportMetrics = () => {
      const nextMetrics = resolvePickerViewportMetrics(
        visualViewport,
        window.innerHeight,
      );
      setViewportMetrics((currentMetrics) =>
        currentMetrics.height === nextMetrics.height &&
        currentMetrics.offsetTop === nextMetrics.offsetTop
          ? currentMetrics
          : nextMetrics,
      );
    };
    updateViewportMetrics();

    visualViewport?.addEventListener('resize', updateViewportMetrics);
    visualViewport?.addEventListener('scroll', updateViewportMetrics);
    window.addEventListener('resize', updateViewportMetrics);

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
      () => searchInputRef.current?.focus({ preventScroll: true }),
      0,
    );
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSelector();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updateViewportMetrics);
      visualViewport?.removeEventListener('resize', updateViewportMetrics);
      visualViewport?.removeEventListener('scroll', updateViewportMetrics);

      bodyStyle.position = previousBodyStyle.position;
      bodyStyle.top = previousBodyStyle.top;
      bodyStyle.left = previousBodyStyle.left;
      bodyStyle.width = previousBodyStyle.width;
      bodyStyle.overflow = previousBodyStyle.overflow;

      if (useFixedBodyLock) {
        window.scrollTo(lockedScrollX, lockedScrollY);
      }
    };
  }, [closeSelector, isOpen]);

  const openSelector = () => {
    setQuery('');
    setViewportMetrics(
      resolvePickerViewportMetrics(window.visualViewport, window.innerHeight),
    );
    setIsOpen(true);
  };

  const pickerViewportStyle: PickerViewportStyle = {
    '--picker-viewport-height': `${viewportMetrics.height}px`,
    '--picker-viewport-offset-top': `${viewportMetrics.offsetTop}px`,
  };

  return (
    <section className="pokemon-picker" aria-labelledby={`${titleId}-label`}>
      <span className="field-label" id={`${titleId}-label`}>ポケモン</span>
      <button
        type="button"
        className="pokemon-picker__trigger"
        onClick={openSelector}
        disabled={loading || pokemon.length === 0}
        aria-haspopup="dialog"
      >
        <span>
          <strong>{selectedPokemon?.displayName ?? 'ポケモンを選択'}</strong>
          {selectedPokemon ? (
            <small>
              図鑑No. {selectedPokemon.dex || '—'}
              {selectedPokemon.isShadow ? ' ・ シャドウ' : ''}
            </small>
          ) : (
            <small>{loading ? 'データを読み込んでいます' : '名前で検索できます'}</small>
          )}
        </span>
        <ChevronIcon />
      </button>

      {loading ? <div className="pokemon-picker__status">ポケモンデータを読み込み中...</div> : null}
      {error ? (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>再取得</button>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="picker-backdrop"
          style={pickerViewportStyle}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeSelector();
          }}
        >
          <section
            className="picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="picker-dialog__header">
              <div>
                <h2 id={titleId}>ポケモンを選択</h2>
                <p>{filteredPokemon.length.toLocaleString('ja-JP')}件</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="閉じる"
                onClick={closeSelector}
              >
                <CloseIcon />
              </button>
            </header>

            <label className="pokemon-search">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="ポケモンを検索"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (resultsRef.current) resultsRef.current.scrollTop = 0;
                }}
                placeholder="日本語名・図鑑番号で検索"
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>

            <div
              ref={resultsRef}
              className="pokemon-results"
              role="listbox"
              aria-label="ポケモン候補"
            >
              {visiblePokemon.map((entry) => (
                <div className="pokemon-result-row" role="presentation" key={entry.speciesId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.speciesId === selectedPokemon?.speciesId}
                    className={entry.speciesId === selectedPokemon?.speciesId ? 'is-selected' : ''}
                    onClick={() => {
                      onSelect(entry);
                      closeSelector();
                    }}
                  >
                    <span className="pokemon-results__dex">#{entry.dex || '—'}</span>
                    <span className="pokemon-results__name">
                      <strong>{entry.displayName}</strong>
                      <small>{entry.form ? 'フォルム違い' : '通常のすがた'}</small>
                    </span>
                    {entry.isShadow ? <span className="pokemon-results__tag">シャドウ</span> : null}
                  </button>
                  <FavoriteButton
                    speciesId={entry.speciesId}
                    displayName={entry.displayName}
                    compact
                    iconOnly
                  />
                </div>
              ))}
              {filteredPokemon.length === 0 ? (
                <p className="empty-state">該当するポケモンが見つかりません</p>
              ) : null}
              {filteredPokemon.length > visiblePokemon.length ? (
                <p className="picker-dialog__hint">
                  候補が多いため先頭{MAX_VISIBLE_RESULTS}件を表示しています。検索で絞り込んでください。
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
