import { useMemo, useState } from 'react';
import { DatasetImage } from '../components/DatasetImage';
import { FavoriteButton } from '../components/FavoriteButton';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadResearch } from '../services/scrapedDuck';
import type { FieldResearchTask } from '../types/scrapedDuck';
import { getResearchTypeLabel, resolveExternalPokemonSpeciesId } from '../utils/scrapedDuckLocalization';
import '../styles/data-pages.css';

type ResearchFilter = 'all' | 'pokemon' | 'event';

function ResearchCard({ task }: { task: FieldResearchTask }) {
  return (
    <article className="dataset-card research-card">
      <div className="research-card__task">
        <span className="data-chip">{getResearchTypeLabel(task.type)}</span>
        <h2>{task.displayText}</h2>
      </div>
      <div className="research-card__rewards">
        <strong>報酬</strong>
        {task.rewards.length > 0 ? (
          <div className="research-rewards">
            {task.rewards.map((reward) => {
              const speciesId = resolveExternalPokemonSpeciesId(reward.name);
              return <div className="research-reward" key={reward.id}>
                <DatasetImage src={reward.image} alt={reward.displayName} />
                <div>
                  <span>{reward.displayName}</span>
                  <div className="data-chip-list">
                    {reward.canBeShiny ? <span className="data-chip data-chip--shiny">色違いあり</span> : null}
                    {reward.combatPower ? (
                      <span className="data-chip">CP {reward.combatPower.min}～{reward.combatPower.max}</span>
                    ) : null}
                  </div>
                  {speciesId ? <FavoriteButton speciesId={speciesId} displayName={reward.displayName} compact /> : null}
                </div>
              </div>;
            })}
          </div>
        ) : (
          <span className="dataset-muted">報酬情報なし</span>
        )}
      </div>
    </article>
  );
}

export function ResearchPage() {
  const state = useCachedDataset(loadResearch);
  const [filter, setFilter] = useState<ResearchFilter>('all');
  const hasEventTasks = state.result?.data.some((task) => task.type === 'event') ?? false;
  const tasks = useMemo(() => {
    const all = state.result?.data ?? [];
    if (filter === 'pokemon') return all.filter((task) => task.rewards.length > 0);
    if (filter === 'event') return all.filter((task) => task.type === 'event');
    return all;
  }, [filter, state.result]);

  return (
    <div className="dataset-page research-page">
      <DatasetPageHeader
        eyebrow="現在のタスクと報酬"
        title="フィールドリサーチ"
        fetchedAt={state.result?.fetchedAt}
        refreshing={state.refreshing}
        onReload={() => void state.reload()}
      />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? <DatasetError onRetry={() => void state.reload()} /> : null}

      {state.result ? (
        <>
          <div className="dataset-filters" aria-label="報酬で絞り込み">
            <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>すべて</button>
            <button type="button" className={filter === 'pokemon' ? 'is-active' : ''} onClick={() => setFilter('pokemon')}>Pokémon</button>
            {hasEventTasks ? (
              <button type="button" className={filter === 'event' ? 'is-active' : ''} onClick={() => setFilter('event')}>イベント限定</button>
            ) : null}
          </div>
          <div className="research-list" aria-busy={state.refreshing}>
            {tasks.length > 0 ? tasks.map((task) => <ResearchCard task={task} key={task.id} />) : (
              <p className="dataset-empty">条件に合うリサーチはありません。</p>
            )}
          </div>
        </>
      ) : null}

      <p className="dataset-page__scope-note">
        現行データの報酬はPokémon形式のみです。ほしのすな・アイテムは判別可能なデータがないため分類していません。
      </p>
      <ScrapedDuckCredit />
    </div>
  );
}

export default ResearchPage;
