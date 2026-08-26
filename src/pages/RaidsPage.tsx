import { useEffect, useMemo, useState } from 'react';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { RaidCard } from '../components/RaidCard';
import { RaidFilters } from '../components/RaidFilters';
import { RefreshButton } from '../components/RefreshButton';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadRaids, SCRAPED_DUCK_CACHE_TTL_MS } from '../services/scrapedDuck';
import {
  filterRaidTierGroups,
  groupRaidsByTier,
  resolveRaidFilterForTarget,
  type RaidFilter,
} from '../utils/raidClassification';
import { getHashQueryParam } from '../types/navigation';
import '../styles/data-pages.css';

export function RaidsPage() {
  const state = useCachedDataset(loadRaids, {
    revalidateOnFocus: true,
    staleTimeMs: SCRAPED_DUCK_CACHE_TTL_MS,
  });
  const [filter, setFilter] = useState<RaidFilter>('all');
  const [targetRaidId, setTargetRaidId] = useState(() =>
    getHashQueryParam(window.location.hash, 'raid'),
  );
  const [highlightedRaidId, setHighlightedRaidId] = useState<string | null>(null);
  const allGroups = useMemo(
    () => groupRaidsByTier(state.result?.data ?? []),
    [state.result],
  );
  const groups = useMemo(
    () => filterRaidTierGroups(allGroups, filter),
    [allGroups, filter],
  );

  useEffect(() => {
    const syncTarget = () => {
      setTargetRaidId(getHashQueryParam(window.location.hash, 'raid'));
    };
    window.addEventListener('hashchange', syncTarget);
    return () => window.removeEventListener('hashchange', syncTarget);
  }, []);

  useEffect(() => {
    setFilter((current) => resolveRaidFilterForTarget(current, targetRaidId));
  }, [targetRaidId]);

  useEffect(() => {
    if (!targetRaidId || !state.result) return undefined;
    let clearTimer: number | undefined;
    const scrollTimer = window.setTimeout(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('[data-raid-id]'),
      ).find((element) => element.dataset.raidId === targetRaidId);
      if (!target) return;
      setHighlightedRaidId(targetRaidId);
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'center',
      });
      clearTimer = window.setTimeout(() => setHighlightedRaidId(null), 2600);
    }, 40);
    return () => {
      window.clearTimeout(scrollTimer);
      if (clearTimer !== undefined) window.clearTimeout(clearTimer);
    };
  }, [filter, state.result, targetRaidId]);

  return (
    <div className="dataset-page raids-page">
      <DatasetPageHeader
        title="レイド"
        fetchedAt={state.result?.fetchedAt}
        action={<RefreshButton loading={state.refreshing} onClick={state.refresh} />}
      />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? (
        <DatasetError action={<RefreshButton loading={state.refreshing} onClick={state.refresh} />} />
      ) : null}

      {state.result ? (
        <>
          <RaidFilters selected={filter} onChange={setFilter} />

          {groups.length > 0 ? (
            <div className="dataset-sections" aria-busy={state.loading}>
              {groups.map((group) => (
                <section className="dataset-section" key={group.key}>
                  <div className="dataset-section__heading">
                    <h2>{group.title}</h2>
                    <span>{group.raids.length}件</span>
                  </div>
                  <div className="dataset-grid">
                    {group.raids.map((raid) => (
                      <div
                        className={`search-target-anchor${highlightedRaidId === raid.id ? ' is-search-target' : ''}`}
                        data-raid-id={raid.id}
                        key={raid.id}
                      >
                        <RaidCard raid={raid} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="dataset-empty">
              {filter === 'all'
                ? '現在表示できるレイドボスはいません。'
                : 'この種類のレイドは現在ありません。'}
            </p>
          )}
        </>
      ) : null}

      <ScrapedDuckCredit />
    </div>
  );
}

export default RaidsPage;
