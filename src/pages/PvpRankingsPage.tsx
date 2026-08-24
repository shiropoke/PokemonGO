import { useEffect, useMemo, useState } from 'react';
import { FavoriteButton } from '../components/FavoriteButton';
import { TypeBadge } from '../components/TypeBadge';
import { fetchGameData } from '../services/gameData';
import { fetchPvpRankings } from '../services/pvpoke';
import type { League } from '../types/calculations';
import type { GameData } from '../types/gameData';
import type { PvpRankingsData } from '../types/pvpRankings';
import { getPokemonDisplayName } from '../utils/pokemonLocalization';
import { formatMoveId, openIvCheckerForSpecies } from '../utils/toolNavigation';
import '../styles/rankings.css';

const PAGE_SIZE = 100;
const LEAGUES: readonly { id: League; label: string; cap: string }[] = [
  { id: 'great', label: 'スーパーリーグ', cap: 'CP 1,500' },
  { id: 'ultra', label: 'ハイパーリーグ', cap: 'CP 2,500' },
  { id: 'master', label: 'マスターリーグ', cap: 'CP上限なし' },
];

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replaceAll('_', ' ').trim();
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '不明';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function PvpRankingsPage() {
  const [league, setLeague] = useState<League>('great');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [requestVersion, setRequestVersion] = useState(0);
  const [data, setData] = useState<PvpRankingsData | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setError(null);
    void fetchPvpRankings({ force: requestVersion > 0 })
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch(() => {
        if (!ignore) setError('PvPランキングを読み込めませんでした');
      });
    return () => {
      ignore = true;
    };
  }, [requestVersion]);

  useEffect(() => {
    let ignore = false;
    void fetchGameData()
      .then((result) => {
        if (!ignore) setGameData(result);
      })
      .catch(() => {
        // ランキング本体は技名が英語ID由来でも表示を継続する。
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [league, query]);

  const rankings = useMemo(() => {
    const source = data?.leagues[league].rankings ?? [];
    const normalizedQuery = normalize(query);
    return source
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        displayName: getPokemonDisplayName({
          speciesId: entry.speciesId,
          speciesName: entry.speciesName,
        }),
        recommendedMoveNames: entry.moveset.map(
          (moveId, moveIndex) =>
            gameData?.moves[moveId]?.name ??
            (moveIndex === 0 ? gameData?.moves[`${moveId}_FAST`]?.name : undefined) ??
            formatMoveId(moveId),
        ),
        types: gameData?.pokemon[entry.speciesId]?.types ?? [],
      }))
      .filter((entry) => {
        if (!normalizedQuery) return true;
        return normalize(
          `${entry.displayName} ${entry.speciesName} ${entry.speciesId}`,
        ).includes(normalizedQuery);
      });
  }, [data, gameData, league, query]);

  const activeLeague = LEAGUES.find((entry) => entry.id === league) ?? LEAGUES[0]!;

  return (
    <div className="pvp-rankings-page">
      <header className="page-heading">
        <div>
          <span className="page-kicker">PvPoke オープンリーグ</span>
          <h1>PvP Pokémonランキング</h1>
          <p>対戦シミュレーションに基づくPokémon種ごとの総合評価です。個体値順位とは異なります。</p>
        </div>
      </header>

      <section className="rankings-panel" aria-labelledby="pvp-league-heading">
        <h2 id="pvp-league-heading" className="sr-only">リーグ選択</h2>
        <div className="ranking-league-tabs" role="tablist" aria-label="リーグ">
          {LEAGUES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={league === entry.id}
              className={league === entry.id ? 'is-active' : ''}
              onClick={() => setLeague(entry.id)}
            >
              <strong>{entry.label}</strong>
              <span>{entry.cap}</span>
            </button>
          ))}
        </div>

        <div className="ranking-toolbar">
          <label>
            <span>Pokémonを検索</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="日本語名・英語名・内部ID"
              autoComplete="off"
            />
          </label>
          {data ? (
            <small>データ生成 {formatGeneratedAt(data.generatedAt)}</small>
          ) : null}
        </div>

        {error ? (
          <div className="ranking-state" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
              再試行
            </button>
          </div>
        ) : !data ? (
          <div className="ranking-state" aria-live="polite">ランキングを読み込んでいます</div>
        ) : rankings.length === 0 ? (
          <div className="ranking-state">該当するPokémonが見つかりません</div>
        ) : (
          <>
            <div className="ranking-summary">
              <strong>{activeLeague.label}</strong>
              <span>{rankings.length.toLocaleString('ja-JP')}件</span>
            </div>
            <ol className="species-ranking-list">
              {rankings.slice(0, visibleCount).map((entry) => (
                <li key={entry.speciesId}>
                  <article className="species-ranking-card">
                    <span className="species-rank" aria-label={`${entry.rank}位`}>
                      {entry.rank}
                    </span>
                    <div className="species-ranking-main">
                      <div className="species-ranking-title">
                        <h3>{entry.displayName}</h3>
                        <div className="species-ranking-actions">
                          <span>Score {entry.score.toFixed(1)}</span>
                          <FavoriteButton
                            speciesId={entry.speciesId}
                            displayName={entry.displayName}
                            compact
                          />
                        </div>
                      </div>
                      {entry.moveset.length > 0 ? (
                        <p className="recommended-moves">
                          <span>推奨技</span>
                          {entry.recommendedMoveNames.join(' / ')}
                        </p>
                      ) : null}
                      {entry.types.length > 0 ? (
                        <p className="ranking-types" aria-label="タイプ">
                          {entry.types.map((type) => (
                            <TypeBadge key={type} type={type} variant="compact" />
                          ))}
                        </p>
                      ) : null}
                      <details>
                        <summary>詳細を見る</summary>
                        {entry.stats ? (
                          <dl className="ranking-stats">
                            <div><dt>攻撃</dt><dd>{entry.stats.atk?.toFixed(1) ?? '—'}</dd></div>
                            <div><dt>防御</dt><dd>{entry.stats.def?.toFixed(1) ?? '—'}</dd></div>
                            <div><dt>HP</dt><dd>{entry.stats.hp ?? '—'}</dd></div>
                            <div><dt>ステータス積</dt><dd>{entry.stats.product ?? '—'}</dd></div>
                          </dl>
                        ) : null}
                        <button
                          type="button"
                          className="ranking-tool-link"
                          onClick={() => openIvCheckerForSpecies(entry.speciesId)}
                        >
                          このPokémonの個体値を調べる
                        </button>
                      </details>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
            {visibleCount < rankings.length ? (
              <button
                type="button"
                className="ranking-load-more"
                onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
              >
                さらに表示
              </button>
            ) : null}
          </>
        )}
      </section>

      <p className="ranking-disclaimer">
        Scoreと推奨技はPvPokeの現行Overallランキング由来です。Scoreは全対面シミュレーションをもとにした相対評価で、環境やアップデートにより変動します。
      </p>
      <p className="data-credit">
        Data provided by{' '}
        <a href="https://github.com/pvpoke/pvpoke" target="_blank" rel="noreferrer">
          PvPoke（MIT License）
        </a>
      </p>
    </div>
  );
}
