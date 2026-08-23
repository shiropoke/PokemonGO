import { useEffect, useMemo, useState } from 'react';
import { fetchRaidCounterAttackers } from '../services/raidCounters';
import type { RaidCounterAttacker } from '../utils/raidCounters';
import { rankRaidCounters } from '../utils/raidCounters';
import { getTypeWeaknesses } from '../utils/typeEffectiveness';
import { TypeBadge } from './TypeBadge';
import '../styles/rankings.css';

interface RaidCountersPanelProps {
  bossSpeciesId: string | null;
  bossName: string;
  bossTypes: string[];
}

function moveLabel(move: { name: string; elite: boolean }): string {
  return `${move.name}${move.elite ? '（エリート技）' : ''}`;
}

export function RaidCountersPanel({
  bossSpeciesId,
  bossName,
  bossTypes,
}: RaidCountersPanelProps) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<40 | 50>(40);
  const [includeMega, setIncludeMega] = useState(true);
  const [includeShadow, setIncludeShadow] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [attackers, setAttackers] = useState<RaidCounterAttacker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let ignore = false;
    setLoading(true);
    setError(null);
    void fetchRaidCounterAttackers({ force: requestVersion > 0 })
      .then((result) => {
        if (!ignore) setAttackers(result);
      })
      .catch(() => {
        if (!ignore) setError('対策データを読み込めませんでした');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [open, requestVersion]);

  const weaknesses = useMemo(() => getTypeWeaknesses(bossTypes), [bossTypes]);
  const counters = useMemo(
    () =>
      rankRaidCounters(bossTypes, attackers, {
        level,
        includeMega,
        includeShadow,
        limit: 12,
      }),
    [attackers, bossTypes, includeMega, includeShadow, level],
  );

  return (
    <div className="raid-counter-widget" data-species-id={bossSpeciesId ?? undefined}>
      <button
        type="button"
        className="raid-counter-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? '対策を閉じる' : '対策を見る'}
      </button>

      {open ? (
        <section className="raid-counter-panel" aria-label={`${bossName}対策`}>
          <div className="raid-counter-heading">
            <div>
              <span>攻撃性能を基準にした参考順位</span>
              <h3>{bossName}対策</h3>
            </div>
            {weaknesses.length > 0 ? (
              <div className="raid-weaknesses" aria-label="弱点">
                {weaknesses.map((entry) => (
                  <TypeBadge key={entry.type} type={entry.type} variant="compact">
                    ×{entry.multiplier.toFixed(2)}
                  </TypeBadge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="raid-counter-controls">
            <fieldset>
              <legend>強化レベル</legend>
              <button type="button" className={level === 40 ? 'is-active' : ''} onClick={() => setLevel(40)}>PL40</button>
              <button type="button" className={level === 50 ? 'is-active' : ''} onClick={() => setLevel(50)}>PL50</button>
            </fieldset>
            <label><input type="checkbox" checked={includeMega} onChange={(event) => setIncludeMega(event.target.checked)} />メガ・ゲンシを含む</label>
            <label><input type="checkbox" checked={includeShadow} onChange={(event) => setIncludeShadow(event.target.checked)} />シャドウを含む</label>
          </div>

          {bossTypes.length === 0 ? (
            <p className="raid-counter-state">ボスのタイプ情報がないため計算できません</p>
          ) : loading ? (
            <p className="raid-counter-state" aria-live="polite">対策候補を計算しています</p>
          ) : error ? (
            <div className="raid-counter-state" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>再試行</button>
            </div>
          ) : counters.length === 0 ? (
            <p className="raid-counter-state">計算できる候補がありません</p>
          ) : (
            <ol className="raid-counter-list">
              {counters.map((counter, index) => (
                <li key={counter.speciesId}>
                  <span className="raid-counter-rank">{index + 1}</span>
                  <div>
                    <strong>{counter.displayName}</strong>
                    <span className="raid-counter-types" aria-label="タイプ">
                      {counter.types.map((type) => (
                        <TypeBadge key={type} type={type} variant="compact" />
                      ))}
                    </span>
                    <span>{moveLabel(counter.fastMove)} / {moveLabel(counter.chargedMove)}</span>
                  </div>
                  <span className="raid-counter-score">
                    参考値 {counter.relativeScore.toFixed(1)}<br />
                    攻撃指数 {Math.round(counter.rawAttackScore).toLocaleString('ja-JP')}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className="raid-counter-note">
            攻撃種族値（攻撃IV15）・PL・技威力・技時間・エネルギー・STAB・タイプ相性から、最良の技サイクルを比較しています。完全なレイドシミュレーションではなく、ボスの技、回避、天候、フレンド/メガブースト、耐久による退場時間は含みません。
          </p>
        </section>
      ) : null}
    </div>
  );
}
