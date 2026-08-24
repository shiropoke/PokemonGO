import type { League, PvpRankResult } from '../types/calculations';
import type { EvolutionPvpResult } from '../utils/evolutionPvp';

interface EvolutionPvpResultsProps {
  results: readonly EvolutionPvpResult[];
  pokemonSelected: boolean;
  loading: boolean;
  error: string | null;
}

const LEAGUE_LABELS: Record<League, string> = {
  great: 'スーパーリーグ',
  ultra: 'ハイパーリーグ',
  master: 'マスターリーグ',
};

const LEAGUES = ['great', 'ultra', 'master'] as const satisfies readonly League[];

function formatLevel(level: number): string {
  return Number.isInteger(level) ? level.toFixed(0) : level.toFixed(1);
}

function formatBattleValue(value: number): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function EvolutionLeagueRow({
  league,
  result,
}: {
  league: League;
  result: PvpRankResult | null;
}) {
  return (
    <div className="evolution-pvp-league">
      <span className="evolution-pvp-league__name">{LEAGUE_LABELS[league]}</span>
      {result ? (
        <>
          <strong className="evolution-pvp-league__rank">
            {result.rank.toLocaleString('ja-JP')} / {result.total.toLocaleString('ja-JP')}
          </strong>
          <small>上位 {result.topPercent.toFixed(2)}%</small>
        </>
      ) : (
        <span className="evolution-pvp-league__unavailable">計算できません</span>
      )}
    </div>
  );
}

function EvolutionDetails({ result }: { result: EvolutionPvpResult }) {
  return (
    <details className="evolution-pvp-details">
      <summary>詳細を表示</summary>
      <div className="evolution-pvp-details__content">
        {LEAGUES.map((league) => {
          const leagueResult = result.pvpResults[league];
          if (!leagueResult) return null;

          return (
            <section key={league} className="evolution-pvp-detail-league">
              <h4>{LEAGUE_LABELS[league]}</h4>
              <dl>
                <div><dt>PL</dt><dd>{formatLevel(leagueResult.level)}</dd></div>
                <div><dt>CP</dt><dd>{leagueResult.cp.toLocaleString('ja-JP')}</dd></div>
                <div><dt>Attack</dt><dd>{formatBattleValue(leagueResult.attack)}</dd></div>
                <div><dt>Defense</dt><dd>{formatBattleValue(leagueResult.defense)}</dd></div>
                <div><dt>HP</dt><dd>{leagueResult.hp.toLocaleString('ja-JP')}</dd></div>
                <div>
                  <dt>Stat Product</dt>
                  <dd>{Math.round(leagueResult.statProduct).toLocaleString('ja-JP')}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
    </details>
  );
}

export function EvolutionPvpResults({
  results,
  pokemonSelected,
  loading,
  error,
}: EvolutionPvpResultsProps) {
  if (!pokemonSelected) return null;

  if (loading) {
    return (
      <section className="evolution-pvp-section" aria-busy="true">
        <h2>進化系のPvP順位</h2>
        <p className="evolution-pvp-status">進化データを読み込んでいます…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="evolution-pvp-section">
        <h2>進化系のPvP順位</h2>
        <p className="evolution-pvp-status" role="status">{error}</p>
      </section>
    );
  }

  // 最終進化では巨大な空カードを表示しない。
  if (results.length === 0) return null;

  return (
    <section className="evolution-pvp-section" aria-labelledby="evolution-pvp-title">
      <header className="evolution-pvp-section__header">
        <div>
          <h2 id="evolution-pvp-title">進化系のPvP順位</h2>
          <p>入力中の同じ個体値と最大PL条件で計算しています。</p>
        </div>
      </header>

      <div className="evolution-pvp-grid">
        {results.map((result) => (
          <article key={result.speciesId} className="evolution-pvp-card">
            <header>
              <h3>{result.pokemon.displayName}</h3>
              <span>進化{result.depth}段階先</span>
            </header>

            <div className="evolution-pvp-leagues">
              {LEAGUES.map((league) => (
                <EvolutionLeagueRow
                  key={league}
                  league={league}
                  result={result.pvpResults[league]}
                />
              ))}
            </div>

            {result.calculationError ? (
              <p className="evolution-pvp-card__error">一部のリーグを計算できませんでした</p>
            ) : null}
            <EvolutionDetails result={result} />
          </article>
        ))}
      </div>
    </section>
  );
}
