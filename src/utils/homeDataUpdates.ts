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

export function createEmptyHomeDataUpdates(): HomeDataUpdates {
  return {
    events: { fetchedAt: null, stale: false },
    raids: { fetchedAt: null, stale: false },
    eggs: { fetchedAt: null, stale: false },
    research: { fetchedAt: null, stale: false },
  };
}

export function hasStaleHomeData(updates: HomeDataUpdates): boolean {
  return HOME_DATASET_KEYS.some((key) => updates[key].stale);
}
