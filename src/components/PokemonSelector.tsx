import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Pokemon } from '../types/pokemon';

const MAX_VISIBLE_RESULTS = 160;

interface PokemonSelectorProps {
  pokemon: Pokemon[];
  selectedPokemon: Pokemon | null;
  loading: boolean;
  error?: string | null;
  onSelect: (pokemon: Pokemon) => void;
  onRetry: () => void;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replaceAll('_', ' ')
    .replace(/[()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const titleId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return pokemon;
    const words = normalizedQuery.split(' ');

    return pokemon.filter((entry) => {
      const searchTarget = normalizeSearchText(
        `${entry.displayName} ${entry.speciesName} ${entry.speciesId} ${entry.dex}`,
      );
      return words.every((word) => searchTarget.includes(word));
    });
  }, [pokemon, query]);

  const visiblePokemon = filteredPokemon.slice(0, MAX_VISIBLE_RESULTS);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const openSelector = () => {
    setQuery('');
    setIsOpen(true);
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
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false);
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
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon />
              </button>
            </header>

            <label className="pokemon-search">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="日本語名・図鑑番号で検索"
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>

            <div className="pokemon-results" role="listbox" aria-label="ポケモン候補">
              {visiblePokemon.map((entry) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={entry.speciesId === selectedPokemon?.speciesId}
                  className={entry.speciesId === selectedPokemon?.speciesId ? 'is-selected' : ''}
                  key={entry.speciesId}
                  onClick={() => {
                    onSelect(entry);
                    setIsOpen(false);
                  }}
                >
                  <span className="pokemon-results__dex">#{entry.dex || '—'}</span>
                  <span className="pokemon-results__name">
                    <strong>{entry.displayName}</strong>
                    <small>{entry.form ? 'フォルム違い' : '通常のすがた'}</small>
                  </span>
                  {entry.isShadow ? <span className="pokemon-results__tag">シャドウ</span> : null}
                </button>
              ))}
              {filteredPokemon.length === 0 ? (
                <p className="empty-state">一致するポケモンが見つかりません</p>
              ) : null}
            </div>

            {filteredPokemon.length > visiblePokemon.length ? (
              <p className="picker-dialog__hint">
                候補が多いため先頭{MAX_VISIBLE_RESULTS}件を表示しています。検索で絞り込んでください。
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
