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
import type { RaidBoss } from '../types/scrapedDuck';
import { getRaidTierLabel } from '../utils/scrapedDuckLocalization';
import '../styles/data-pages.css';

interface RaidGroup {
  key: string;
  title: string;
  raids: RaidBoss[];
}

function getRaidGroup(raid: RaidBoss): { key: string; title: string; order: number } {
  if (/^shadow\s/i.test(raid.name)) return { key: 'shadow', title: 'シャドウレイド', order: 5 };
  const tier = getRaidTierLabel(raid.tier);
  if (tier === '伝説 / ★5') return { key: 'five', title: tier, order: 1 };
  if (tier === 'メガ') return { key: 'mega', title: tier, order: 2 };
  if (tier === '★3') return { key: 'three', title: tier, order: 3 };
  if (tier === '★1') return { key: 'one', title: tier, order: 4 };
  return { key: raid.tier || 'other', title: tier || 'その他', order: 6 };
}

export function RaidsPage() {
  const state = useCachedDataset(loadRaids);
  const groups = useMemo(() => {
    const grouped = new Map<string, RaidGroup & { order: number }>();
    for (const raid of state.result?.data ?? []) {
      const category = getRaidGroup(raid);
      const group = grouped.get(category.key);
      if (group) group.raids.push(raid);
      else grouped.set(category.key, { ...category, raids: [raid] });
    }
    return [...grouped.values()].sort((left, right) => left.order - right.order);
  }, [state.result]);

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
