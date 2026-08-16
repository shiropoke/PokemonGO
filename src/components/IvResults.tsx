import type {
  IvSummary,
  League,
  MasterLeagueResult,
  PvpRankResult,
} from '../types/calculations';

interface IvResultsProps {
  summary: IvSummary;
  league: League;
  pokemonSelected: boolean;
  cpWasEntered: boolean;
  matchingLevels: number[];
  pvpResult: PvpRankResult | null;
  masterResult: MasterLeagueResult | null;
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

export function IvResults({
  summary,
  league,
  pokemonSelected,
  cpWasEntered,
  matchingLevels,
  pvpResult,
  masterResult,
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

      {pvpResult ? (
        <article className="result-card result-card--league">
          <header>
            <div>
              <span className="eyebrow">PvP個体値</span>
              <h3>{LEAGUE_LABELS[league]}</h3>
            </div>
            <div className="rank-summary">
              <strong>{pvpResult.rank.toLocaleString('ja-JP')}位</strong>
              <span>/ {pvpResult.total.toLocaleString('ja-JP')}</span>
            </div>
          </header>
          <div className="top-percent">
            上位 <strong>{pvpResult.topPercent.toFixed(2)}%</strong>
          </div>
          <dl className="result-metrics">
            <ResultMetric label="適正PL" value={formatLevel(pvpResult.level)} />
            <ResultMetric label="CP" value={pvpResult.cp.toLocaleString('ja-JP')} />
            <ResultMetric label="Attack" value={formatBattleValue(pvpResult.attack)} />
            <ResultMetric label="Defense" value={formatBattleValue(pvpResult.defense)} />
            <ResultMetric label="HP" value={pvpResult.hp.toLocaleString('ja-JP')} />
            <ResultMetric
              label="Stat Product"
              value={Math.round(pvpResult.statProduct).toLocaleString('ja-JP')}
            />
          </dl>
        </article>
      ) : null}

      {masterResult ? (
        <article className="result-card result-card--league">
          <header>
            <div>
              <span className="eyebrow">最大強化時</span>
              <h3>{LEAGUE_LABELS.master}</h3>
            </div>
            {masterResult.isPerfect ? <span className="perfect-badge">PERFECT</span> : null}
          </header>
          <dl className="result-metrics">
            <ResultMetric label="最大PL" value={formatLevel(masterResult.level)} />
            <ResultMetric label="最大CP" value={masterResult.cp.toLocaleString('ja-JP')} />
            <ResultMetric label="Attack" value={formatBattleValue(masterResult.attack)} />
            <ResultMetric label="Defense" value={formatBattleValue(masterResult.defense)} />
            <ResultMetric label="HP" value={masterResult.hp.toLocaleString('ja-JP')} />
            <ResultMetric label="個体値" value={`${masterResult.ivPercentage.toFixed(1)}%`} />
          </dl>
          <p className="result-note">15 / 15 / 15 が理論上の最大ステータスです。</p>
        </article>
      ) : null}
    </section>
  );
}

