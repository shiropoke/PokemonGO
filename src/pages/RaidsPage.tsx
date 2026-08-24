import { useEffect, useMemo, useState } from 'react';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { RaidCard } from '../components/RaidCard';
import { RefreshButton } from '../components/RefreshButton';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadRaids } from '../services/scrapedDuck';
import { groupRaidsByTier } from '../utils/raidClassification';
import { getHashQueryParam } from '../types/navigation';
import '../styles/data-pages.css';

export function RaidsPage() {
  const state = useCachedDataset(loadRaids);
  const [targetRaidId, setTargetRaidId] = useState(() =>
    getHashQueryParam(window.location.hash, 'raid'),
  );
  const [highlightedRaidId, setHighlightedRaidId] = useState<string | null>(null);
  const groups = useMemo(
    () => groupRaidsByTier(state.result?.data ?? []),
    [state.result],
  );

  useEffect(() => {
    const syncTarget = () => {
      setTargetRaidId(getHashQueryParam(window.location.hash, 'raid'));
    };
    window.addEventListener('hashchange', syncTarget);
    return () => window.removeEventListener('hashchange', syncTarget);
  }, []);

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
  }, [state.result, targetRaidId]);

  return (
    <div className="dataset-page raids-page">
      <DatasetPageHeader
        eyebrow="現在のラインナップ"
        title="レイド"
        fetchedAt={state.result?.fetchedAt}
        action={<RefreshButton />}
      />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? <DatasetError action={<RefreshButton />} /> : null}

      {state.result ? (
        groups.length > 0 ? (
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
          <p className="dataset-empty">現在表示できるレイドボスはいません。</p>
        )
      ) : null}

      <ScrapedDuckCredit />
    </div>
  );
}

export default RaidsPage;
