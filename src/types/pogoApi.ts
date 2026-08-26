import type { ExternalDataResult } from './externalData';

export type PogoApiResult<T> = ExternalDataResult<T, 'pogoapi'>;

export interface PogoApiPokemonIdentity {
  id: number;
  name: string;
}

export interface PogoApiPokemonStatsEntry {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  base_attack: number;
  base_defense: number;
  base_stamina: number;
}

export interface PogoApiPokemonTypesEntry {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  type: string[];
}

export interface PogoApiPokemonMaxCpEntry {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  max_cp: number;
}

export interface PogoApiEvolutionTarget {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  candy_required?: number;
  item_required?: string;
  lure_required?: string;
  buddy_distance_required?: number;
  must_be_buddy_to_evolve?: boolean;
  only_evolves_in_daytime?: boolean;
  only_evolves_in_nighttime?: boolean;
  gender_required?: string;
  no_candy_cost_if_traded?: boolean;
  priority?: number;
  upside_down?: boolean;
}

export interface PogoApiPokemonEvolutionEntry {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  evolutions: PogoApiEvolutionTarget[];
}

export interface PogoApiShinyPokemonEntry extends PogoApiPokemonIdentity {
  found_wild: boolean;
  found_raid: boolean;
  found_egg: boolean;
  found_evolution: boolean;
  found_research: boolean;
  found_photobomb: boolean;
  alolan_shiny?: boolean;
}

export interface PogoApiCurrentPokemonMovesEntry {
  pokemon_id: number;
  pokemon_name: string;
  form: string;
  fast_moves: string[];
  charged_moves: string[];
  elite_fast_moves: string[];
  elite_charged_moves: string[];
}

export interface PogoApiMove {
  move_id: number;
  name: string;
  type: string;
  power: number;
  energy_delta: number;
  duration?: number;
  turn_duration?: number;
  critical_chance?: number;
  stamina_loss_scaler?: number;
  buffs?: {
    activation_chance?: number;
    attacker_attack_stat_stage_change?: number;
    attacker_defense_stat_stage_change?: number;
    target_attack_stat_stage_change?: number;
    target_defense_stat_stage_change?: number;
  };
}

export interface PogoApiRaidBoss {
  id: number;
  name: string;
  form: string;
  tier: number | string;
  type: string[];
  boosted_weather: string[];
  possible_shiny: boolean;
  min_unboosted_cp: number | null;
  max_unboosted_cp: number | null;
  min_boosted_cp: number | null;
  max_boosted_cp: number | null;
}

export interface PogoApiRaidBosses {
  current: Record<string, PogoApiRaidBoss[]>;
  previous: Record<string, PogoApiRaidBoss[]>;
}
