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
import { loadEggs } from '../services/scrapedDuck';
import type { EggHatch } from '../types/scrapedDuck';
import {
  buildEggFilterOptions,
  EGG_FILTER_ALL,
  filterEggs,
  groupEggsForDisplay,
  resolveEggFilter,
  type EggFilter,
} from '../utils/eggFilters';
import { resolveExternalPokemonSpeciesId } from '../utils/scrapedDuckLocalization';
import '../styles/data-pages.css';

function EggCard({ egg }: { egg: EggHatch }) {
  const speciesId = resolveExternalPokemonSpeciesId(egg.name);
  return (
    <article className="dataset-card egg-card">
      <DatasetImage src={egg.image} alt={egg.displayName} />
      <div className="egg-card__body">
        <h3>{egg.displayName}</h3>
        <div className="data-chip-list">
          <span className="data-chip">{egg.eggType}</span>
          {egg.canBeShiny ? <span className="data-chip data-chip--shiny">色違いあり</span> : null}
          {egg.rarity !== null ? <span className="data-chip">レア度 {egg.rarity}</span> : null}
          {egg.isGiftExchange ? <span className="data-chip">ギフト交換</span> : null}
          {egg.isRegional ? <span className="data-chip">地域限定</span> : null}
        </div>
        {egg.combatPower ? (
          <span className="dataset-muted">孵化時CP {egg.combatPower.min}～{egg.combatPower.max}</span>
        ) : null}
        {speciesId ? <FavoriteButton speciesId={speciesId} displayName={egg.displayName} compact /> : null}
      </div>
    </article>
  );
}

export function EggsPage() {
  const state = useCachedDataset(loadEggs);
  const [filter, setFilter] = useState<EggFilter>(EGG_FILTER_ALL);
  const filterOptions = useMemo(
    () => buildEggFilterOptions(state.result?.data ?? []),
    [state.result],
  );
  const resolvedFilter = resolveEggFilter(filter, filterOptions);

  useEffect(() => {
    if (filter !== resolvedFilter) setFilter(resolvedFilter);
  }, [filter, resolvedFilter]);

  const groups = useMemo(() => {
    const eggs = filterEggs(state.result?.data ?? [], resolvedFilter);
    return groupEggsForDisplay(eggs);
  }, [resolvedFilter, state.result]);

  return (
    <div className="dataset-page eggs-page">
      <DatasetPageHeader title="タマゴ" />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? (
        <DatasetError action={<RefreshButton loading={state.refreshing} label="再試行" onClick={state.refresh} />} />
      ) : null}

      {state.result ? (
        <>
          <FilterChips<EggFilter>
            ariaLabel="タマゴ種類フィルター"
            className="egg-filters"
            options={filterOptions}
            selected={resolvedFilter}
            onChange={setFilter}
          />
          <div className="dataset-sections" aria-busy={state.refreshing}>
            {groups.distanceGroups.map(([eggType, eggs]) => (
              <section className="dataset-section" key={eggType}>
                <div className="dataset-section__heading"><h2>{eggType}タマゴ</h2><span>{eggs.length}匹</span></div>
                <div className="egg-grid">{eggs.map((egg) => <EggCard egg={egg} key={egg.id} />)}</div>
              </section>
            ))}
            {groups.adventureSync.length > 0 ? (
              <section className="dataset-section">
                <div className="dataset-section__heading"><h2>いつでも冒険モード</h2><span>{groups.adventureSync.length}匹</span></div>
                <div className="egg-grid">{groups.adventureSync.map((egg) => <EggCard egg={egg} key={egg.id} />)}</div>
              </section>
            ) : null}
            {groups.distanceGroups.length === 0 && groups.adventureSync.length === 0 ? (
              <p className="dataset-empty">
                {resolvedFilter === EGG_FILTER_ALL
                  ? '現在表示できるタマゴ情報はありません。'
                  : 'この種類のタマゴ情報は現在ありません。'}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
      <ScrapedDuckCredit />
    </div>
  );
}

export default EggsPage;
