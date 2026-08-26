import type { PokemonType } from './gameData';

export type UnifiedDataSource =
  | 'pogoapi'
  | 'watwowmap'
  | 'pokeminers'
  | 'existing';

export interface UnifiedStats {
  attack: number;
  defense: number;
  stamina: number;
}

export interface UnifiedFormIdentity {
  key: string;
  id: number | null;
  nameEn: string;
  nameJa?: string;
  pogoApi?: string;
  watWowMapProto?: string;
  temporaryEvolutionId?: number;
  costumeId?: number;
}

export interface UnifiedEvolutionConditions {
  candy?: number;
  item?: string;
  itemId?: number;
  lure?: string;
  lureItemId?: number;
  buddyDistanceKm?: number;
  mustBeBuddy?: boolean;
  timeOfDay?: 'day' | 'night';
  gender?: string;
  noCandyCostIfTraded?: boolean;
  upsideDown?: boolean;
}

export interface UnifiedEvolution {
  targetKey?: string;
  targetPokedexId: number;
  targetFormId: number | null;
  conditions: UnifiedEvolutionConditions;
  sources: UnifiedDataSource[];
}

export interface UnifiedPokemonMoveReferences {
  fast: string[];
  charged: string[];
  eliteFast: string[];
  eliteCharged: string[];
  unresolved?: string[];
}

export interface UnifiedPokemonSourceInfo {
  sources: UnifiedDataSource[];
  fieldSources: Partial<
    Record<
      | 'names'
      | 'form'
      | 'types'
      | 'stats'
      | 'maxCp'
      | 'size'
      | 'buddy'
      | 'moves'
      | 'evolutions'
      | 'flags'
      | 'costs',
      UnifiedDataSource
    >
  >;
  aliases?: Array<{ source: UnifiedDataSource; name: string }>;
}

export interface UnifiedPokemon {
  key: string;
  pokedexId: number;
  existingSpeciesId?: string;
  names: {
    ja: string;
    en: string;
  };
  form: UnifiedFormIdentity;
  generation?: { id?: number; name?: string };
  types: PokemonType[];
  stats?: UnifiedStats;
  maxCp?: number;
  size?: {
    heightM?: number;
    weightKg?: number;
    settings?: Record<string, number>;
  };
  buddy?: {
    group?: number;
    candyDistanceKm?: number;
    megaEnergy?: number;
  };
  secondMoveCost?: { stardust?: number; candy?: number };
  purificationCost?: { stardust?: number; candy?: number };
  eligibility?: {
    gymDefender?: boolean;
    tradable?: boolean;
    transferable?: boolean;
  };
  flags: {
    legendary?: boolean;
    mythic?: boolean;
    ultraBeast?: boolean;
    shinyAvailable?: boolean;
    shinyMethods?: {
      wild?: boolean;
      raid?: boolean;
      egg?: boolean;
      evolution?: boolean;
      research?: boolean;
      photobomb?: boolean;
    };
    shadowAvailable?: boolean;
    costume?: boolean;
  };
  moves: UnifiedPokemonMoveReferences;
  evolutions: UnifiedEvolution[];
  sourceInfo: UnifiedPokemonSourceInfo;
}

export interface UnifiedMoveMetrics {
  power?: number;
  durationMs?: number;
  energyDelta?: number;
  criticalChance?: number;
  turns?: number;
}

export interface UnifiedMoveBuffs {
  activationChance?: number;
  attackerAttack?: number;
  attackerDefense?: number;
  targetAttack?: number;
  targetDefense?: number;
}

export interface UnifiedMove {
  key: string;
  moveId?: number;
  gameMasterId?: string;
  names: { ja: string; en: string };
  type: PokemonType;
  kind: 'fast' | 'charged';
  pve?: UnifiedMoveMetrics;
  pvp?: UnifiedMoveMetrics;
  buffs?: UnifiedMoveBuffs;
  sources: UnifiedDataSource[];
  fieldSources: Partial<
    Record<'names' | 'type' | 'kind' | 'pve' | 'pvp' | 'buffs', UnifiedDataSource>
  >;
}

export interface UnifiedDataConflict {
  entity: 'pokemon' | 'move';
  key: string;
  field: string;
  selectedSource: UnifiedDataSource;
  sourceValues: Partial<Record<UnifiedDataSource, unknown>>;
}

export interface UnifiedDataMetadata {
  schemaVersion: number;
  generatedAt: string;
  sources: Record<string, { url: string; fetchedAt?: string; available: boolean }>;
  counts: {
    pokemon: number;
    moves: number;
    conflicts: number;
    unmatchedForms: number;
    unresolvedMoveNames: number;
  };
  coverage: Record<string, number>;
  unmatchedForms: Array<{
    source: UnifiedDataSource;
    pokedexId: number;
    form: string;
  }>;
  conflicts: UnifiedDataConflict[];
}

export interface UnifiedPokemonDataset {
  schemaVersion: number;
  generatedAt: string;
  pokemon: UnifiedPokemon[];
}

export interface UnifiedMoveDataset {
  schemaVersion: number;
  generatedAt: string;
  moves: UnifiedMove[];
}
