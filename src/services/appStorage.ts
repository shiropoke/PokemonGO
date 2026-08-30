export const THEME_STORAGE_KEY = 'pokemon-go:theme';
export const TAB_POSITION_STORAGE_KEY = 'pokemon-go:tab-position';
export const MAIN_TABS_STORAGE_KEY = 'pokemon-go:main-tabs:v1';
export const HOME_SECTION_ORDER_STORAGE_KEY = 'pokemon-go:home-sections:v1';
export const FAVORITES_STORAGE_KEY = 'pokemon-go:favorites';
export const IV_CHECKER_STORAGE_KEY = 'pokemon-go-information:iv-checker:v1';
export const WEEKLY_EVENT_VIEW_STORAGE_KEY = 'pokemon-go:weekly-event-view';
export const EVENTS_CACHE_KEY = 'pokemon-go-information:events:v1';
export const POKEMON_DATA_CACHE_KEY = 'pokemon-go-information:pokemon-data:v2';
/** 旧PoGoAPI主導レイド実装のcache。読み込みには使わず、保存データ削除時だけ安全に除去する。 */
const LEGACY_POGO_RAID_DATA_CACHE_KEY = 'pokemon-go-information:raids:pogoapi:v1';

export const SCRAPED_DUCK_CACHE_KEYS = {
  raids: 'pokemon-go-information:scraped-duck:raids:v1',
  research: 'pokemon-go-information:scraped-duck:research:v1',
  eggs: 'pokemon-go-information:scraped-duck:eggs:v1',
  rocket: 'pokemon-go-information:scraped-duck:rocket:v1',
} as const;

export const APP_LOCAL_STORAGE_KEYS = [
  THEME_STORAGE_KEY,
  TAB_POSITION_STORAGE_KEY,
  MAIN_TABS_STORAGE_KEY,
  HOME_SECTION_ORDER_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  IV_CHECKER_STORAGE_KEY,
  WEEKLY_EVENT_VIEW_STORAGE_KEY,
  EVENTS_CACHE_KEY,
  POKEMON_DATA_CACHE_KEY,
  LEGACY_POGO_RAID_DATA_CACHE_KEY,
  ...Object.values(SCRAPED_DUCK_CACHE_KEYS),
] as const;

export interface AppStorage {
  removeItem(key: string): void;
}

export interface ClearAppLocalStorageResult {
  success: boolean;
  failedKeys: string[];
}

/** このサイトが明示的に所有するlocalStorageキーだけを削除します。 */
export function clearAppLocalStorage(
  storage?: AppStorage | null,
): ClearAppLocalStorageResult {
  if (!storage) {
    return { success: false, failedKeys: [...APP_LOCAL_STORAGE_KEYS] };
  }

  const failedKeys: string[] = [];
  APP_LOCAL_STORAGE_KEYS.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      failedKeys.push(key);
    }
  });

  return {
    success: failedKeys.length === 0,
    failedKeys,
  };
}
