import { useMemo } from 'react';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { RaidCard } from '../components/RaidCard';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadRaids } from '../services/scrapedDuck';
import { groupRaidsByTier } from '../utils/raidClassification';
import '../styles/data-pages.css';

export function RaidsPage() {
  const state = useCachedDataset(loadRaids);
  const groups = useMemo(
    () => groupRaidsByTier(state.result?.data ?? []),
    [state.result],
  );

  return (
    <div className="dataset-page raids-page">
      <DatasetPageHeader
        eyebrow="現在のラインナップ"
        title="レイド"
        fetchedAt={state.result?.fetchedAt}
        refreshing={state.refreshing}
        onReload={() => void state.reload()}
      />
      <p className="dataset-page__intro">
        現在公開されているレイドボスを、取得データに含まれるレイド区分で表示します。
      </p>

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? <DatasetError onRetry={() => void state.reload()} /> : null}

      {state.result ? (
        groups.length > 0 ? (
          <div className="dataset-sections" aria-busy={state.refreshing}>
            {groups.map((group) => (
              <section className="dataset-section" key={group.key}>
                <div className="dataset-section__heading">
                  <h2>{group.title}</h2>
                  <span>{group.raids.length}件</span>
                </div>
                <div className="dataset-grid">
                  {group.raids.map((raid) => <RaidCard raid={raid} key={raid.id} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="dataset-empty">現在表示できるレイドボスはいません。</p>
        )
      ) : null}

      <p className="dataset-page__scope-note">
        出現期間はScrapedDuckの現行レイドデータに含まれないため表示していません。
      </p>
      <ScrapedDuckCredit />
    </div>
  );
}

export default RaidsPage;
