import { formatLastUpdated } from './date';

export const HOME_DATASET_KEYS = [
  'events',
  'raids',
  'eggs',
  'research',
] as const;

export type HomeDatasetKey = (typeof HOME_DATASET_KEYS)[number];

export interface HomeDatasetUpdate {
  fetchedAt: number | null;
  stale: boolean;
}

export type HomeDataUpdates = Record<HomeDatasetKey, HomeDatasetUpdate>;

export const HOME_DATASET_LABELS: Readonly<Record<HomeDatasetKey, string>> = {
  events: 'イベント',
  raids: 'レイド',
  eggs: 'タマゴ',
  research: 'リサーチ',
};

export function createEmptyHomeDataUpdates(): HomeDataUpdates {
  return {
    events: { fetchedAt: null, stale: false },
    raids: { fetchedAt: null, stale: false },
    eggs: { fetchedAt: null, stale: false },
    research: { fetchedAt: null, stale: false },
  };
}

export function formatHomeDataUpdateSummary(
  updates: HomeDataUpdates,
): string | null {
  const timestamps = HOME_DATASET_KEYS.flatMap((key) => {
    const value = updates[key].fetchedAt;
    return value !== null && Number.isFinite(value) ? [value] : [];
  });
  if (timestamps.length === 0) return null;

  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);
  const oldestLabel = formatLastUpdated(oldest);
  const newestLabel = formatLastUpdated(newest);
  const sameMinute = Math.floor(oldest / 60_000) === Math.floor(newest / 60_000);
  const oldestDate = new Date(oldest);
  const newestDate = new Date(newest);
  const sameLocalDay =
    oldestDate.getFullYear() === newestDate.getFullYear() &&
    oldestDate.getMonth() === newestDate.getMonth() &&
    oldestDate.getDate() === newestDate.getDate();

  if (sameMinute) return `データ更新 ${newestLabel}`;
  if (sameLocalDay) return `データ更新 ${oldestLabel}〜${newestLabel}`;

  const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `データ更新 ${dateTimeFormatter.format(oldest)}〜${dateTimeFormatter.format(newest)}`;
}

export function hasStaleHomeData(updates: HomeDataUpdates): boolean {
  return HOME_DATASET_KEYS.some((key) => updates[key].stale);
}
