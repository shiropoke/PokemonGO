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
}

export interface CombatPowerRange {
  min: number;
  max: number;
}

export interface RaidBoss {
  id: string;
  name: string;
  displayName: string;
  /** 既存Game Master辞書と照合できた場合だけ設定する内部ID。 */
  speciesId: string | null;
  tier: string;
  /** ScrapedDuckの現行データでは、nameの `Shadow ` 接頭辞で表現される。 */
  isShadow: boolean;
  canBeShiny: boolean;
  types: string[];
  combatPower: {
    normal: CombatPowerRange | null;
    boosted: CombatPowerRange | null;
  } | null;
  boostedWeather: string[];
  image: string | null;
}

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
  firstPokemon: RocketPokemon[];
  secondPokemon: RocketPokemon[];
  thirdPokemon: RocketPokemon[];
}
