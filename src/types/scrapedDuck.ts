import type { CombatPowerRange } from './raids';

export type ScrapedDuckDataset = 'raids' | 'research' | 'eggs' | 'rocket';

export type CachedDataSource = 'network' | 'cache';

export interface CachedDataResult<T> {
  data: T;
  fetchedAt: number;
  source: CachedDataSource;
  stale: boolean;
}

export interface DatasetLoadOptions {
  signal?: AbortSignal;
  /** 手動更新時はlocalStorageとHTTPのfresh cacheを使わず再取得する。 */
  forceRefresh?: boolean;
}

/** @deprecated レイド共通型は `types/raids` から利用します。 */
export type { CombatPowerRange } from './raids';

/** @deprecated レイド共通型は `types/raids` から利用します。 */
export type { RaidBoss } from './raids';

export interface ResearchReward {
  id: string;
  name: string;
  displayName: string;
  image: string | null;
  canBeShiny: boolean;
  combatPower: CombatPowerRange | null;
}

export interface FieldResearchTask {
  id: string;
  text: string;
  displayText: string;
  type: string | null;
  rewards: ResearchReward[];
}

export interface EggHatch {
  id: string;
  name: string;
  displayName: string;
  eggType: string;
  isAdventureSync: boolean;
  isRegional: boolean;
  isGiftExchange: boolean;
  canBeShiny: boolean;
  rarity: number | null;
  image: string | null;
  combatPower: CombatPowerRange | null;
}

export interface RocketPokemon {
  id: string;
  name: string;
  displayName: string;
  image: string | null;
  types: string[];
  isEncounter: boolean;
  canBeShiny: boolean;
}

export interface RocketLineup {
  id: string;
  name: string;
  displayName: string;
  title: string;
  titleLabel: string;
  type: string | null;
  dialogues: string[];
  firstPokemon: RocketPokemon[];
  secondPokemon: RocketPokemon[];
  thirdPokemon: RocketPokemon[];
}
