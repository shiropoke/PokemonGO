import { useEffect, useMemo, useState } from 'react';
import { DatasetImage } from '../components/DatasetImage';
import { FavoriteButton } from '../components/FavoriteButton';
import { FilterChips } from '../components/FilterChips';
import { RefreshButton } from '../components/RefreshButton';
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
import {
  buildResearchFilterOptions,
  filterResearchTasks,
  RESEARCH_FILTER_ALL,
  resolveResearchFilter,
  type ResearchFilter,
} from '../utils/researchFilters';
import { getResearchTypeLabel, resolveExternalPokemonSpeciesId } from '../utils/scrapedDuckLocalization';
import '../styles/data-pages.css';

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
  const [filter, setFilter] = useState<ResearchFilter>(RESEARCH_FILTER_ALL);
  const filterOptions = useMemo(
    () => buildResearchFilterOptions(state.result?.data ?? []),
    [state.result],
  );
  const resolvedFilter = resolveResearchFilter(filter, filterOptions);
  const tasks = useMemo(
    () => filterResearchTasks(state.result?.data ?? [], resolvedFilter),
    [resolvedFilter, state.result],
  );

  useEffect(() => {
    if (filter !== resolvedFilter) setFilter(resolvedFilter);
  }, [filter, resolvedFilter]);

  return (
    <div className="dataset-page research-page">
      <DatasetPageHeader
        title="フィールドリサーチ"
        fetchedAt={state.result?.fetchedAt}
      />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? (
        <DatasetError action={<RefreshButton loading={state.refreshing} label="再試行" onClick={state.refresh} />} />
      ) : null}

      {state.result ? (
        <>
          <FilterChips<ResearchFilter>
            ariaLabel="リサーチ種類フィルター"
            className="research-filters"
            options={filterOptions}
            selected={resolvedFilter}
            onChange={setFilter}
          />
          <div className="research-list" aria-busy={state.refreshing}>
            {tasks.length > 0 ? tasks.map((task) => <ResearchCard task={task} key={task.id} />) : (
              <p className="dataset-empty">条件に合うリサーチはありません。</p>
            )}
          </div>
        </>
      ) : null}
      <ScrapedDuckCredit />
    </div>
  );
}

export default ResearchPage;
