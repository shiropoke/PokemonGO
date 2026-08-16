import type {
  IvSummary,
  League,
  PvpRankResult,
} from '../types/calculations';

interface IvResultsProps {
  summary: IvSummary;
  pokemonSelected: boolean;
  cpWasEntered: boolean;
  matchingLevels: number[];
  pvpResults: Record<League, PvpRankResult | null>;
  calculationError?: string | null;
}

interface ResultMetricProps {
  label: string;
  value: string | number;
}

const LEAGUE_LABELS: Record<League, string> = {
  great: 'スーパーリーグ',
  ultra: 'ハイパーリーグ',
  master: 'マスターリーグ',
};

const LEAGUES = ['great', 'ultra', 'master'] as const satisfies readonly League[];

function ResultMetric({ label, value }: ResultMetricProps) {
  return (
    <div className="result-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatLevel(level: number): string {
  return Number.isInteger(level) ? level.toFixed(0) : level.toFixed(1);
}

function formatBattleValue(value: number): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function CpMatchMessage({
  pokemonSelected,
  matchingLevels,
}: Pick<IvResultsProps, 'pokemonSelected' | 'matchingLevels'>) {
  if (!pokemonSelected) {
    return <span>PL候補を確認するにはポケモンを選択してください</span>;
  }
  if (matchingLevels.length === 0) {
    return <span>入力されたCPと個体値に一致するPLが見つかりません</span>;
  }

  return (
    <span>
      現在PL候補：{matchingLevels.map(formatLevel).join(' / ')}
    </span>
  );
}

function LeagueResultCard({
  league,
  result,
}: {
  league: League;
  result: PvpRankResult | null;
}) {
  return (
    <article className="result-card result-card--league">
      <header>
        <div>
          <span className="eyebrow">PvP個体値</span>
          <h3>{LEAGUE_LABELS[league]}</h3>
        </div>
        {result ? (
          <div className="rank-summary">
            <span>順位</span>
            <strong>{result.rank.toLocaleString('ja-JP')}</strong>
            <span>/ {result.total.toLocaleString('ja-JP')}</span>
          </div>
        ) : null}
      </header>
      {result ? (
        <>
          <div className="top-percent">
            上位 <strong>{result.topPercent.toFixed(2)}%</strong>
          </div>
          <dl className="result-metrics">
            <ResultMetric label="PL" value={formatLevel(result.level)} />
            <ResultMetric label="CP" value={result.cp.toLocaleString('ja-JP')} />
            <ResultMetric label="Attack" value={formatBattleValue(result.attack)} />
            <ResultMetric label="Defense" value={formatBattleValue(result.defense)} />
            <ResultMetric label="HP" value={result.hp.toLocaleString('ja-JP')} />
            <ResultMetric
              label="Stat Product"
              value={Math.round(result.statProduct).toLocaleString('ja-JP')}
            />
          </dl>
          {league === 'master' ? (
            <p className="result-note">15 / 15 / 15 が理論上の最大ステータスです。</p>
          ) : null}
        </>
      ) : (
        <p className="result-note">計算できません</p>
      )}
    </article>
  );
}

export function IvResults({
  summary,
  pokemonSelected,
  cpWasEntered,
  matchingLevels,
  pvpResults,
  calculationError,
}: IvResultsProps) {
  return (
    <section className="checker-results" aria-labelledby="checker-results-title">
      <h2 id="checker-results-title">計算結果</h2>

      {cpWasEntered ? (
        <p className="cp-match-result" role="status">
          <CpMatchMessage
            pokemonSelected={pokemonSelected}
            matchingLevels={matchingLevels}
          />
        </p>
      ) : null}

      <article className="result-card result-card--iv">
        <header>
          <h3>個体値</h3>
          <span className="star-rating">{summary.gradeLabel}</span>
        </header>
        <strong className="iv-percentage">{summary.percentage.toFixed(1)}%</strong>
        <p>{summary.total} / 45</p>
      </article>

      {!pokemonSelected ? (
        <div className="result-placeholder">ポケモンを選択するとPvP計算結果を表示します</div>
      ) : null}

      {calculationError ? (
        <div className="inline-error" role="alert">{calculationError}</div>
      ) : null}

      {pokemonSelected
        ? LEAGUES.map((league) => (
            <LeagueResultCard
              key={league}
              league={league}
              result={pvpResults[league]}
            />
          ))
        : null}
    </section>
  );
}
