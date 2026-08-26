import type { ExternalDataResult } from './externalData';

export type WatWowMapResult<T> = ExternalDataResult<T, 'watwowmap'>;

export interface WatWowMapEvolution {
  evoId: number;
  formId: number;
  candyCost?: number;
  itemId?: number;
  lureItemId?: number;
  distance?: number;
}

export interface WatWowMapPokemon {
  pokedexId: number;
  pokemonName: string;
  defaultFormId: number;
  forms: number[];
  types: number[];
  quickMoves: number[];
  chargedMoves: number[];
  eliteQuickMoves: number[];
  eliteChargedMoves: number[];
  evolutions: WatWowMapEvolution[];
  attack?: number;
  defense?: number;
  stamina?: number;
  generation?: string;
}

export interface WatWowMapMove {
  moveId: number;
  moveName: string;
  proto: string;
  fast: boolean;
  type: number;
  power?: number;
  durationMs?: number;
  energyDelta?: number;
  pvpPower?: number;
  pvpEnergyDelta?: number;
}

export interface WatWowMapForm {
  formId: number;
  formName: string;
  proto: string;
}

export interface WatWowMapCostume {
  id: number;
  name: string;
  proto: string;
  noEvolve: boolean;
}

export interface WatWowMapItem {
  itemId: number;
  itemName: string;
  proto: string;
  type?: string;
  category?: string;
}

export interface WatWowMapInvasionEncounter {
  position: string;
  id?: number;
}

export interface WatWowMapInvasion {
  id: number;
  type: string;
  gender: number;
  grunt: string;
  proto: string;
  active: boolean;
  firstReward: boolean;
  secondReward: boolean;
  thirdReward: boolean;
  encounters: WatWowMapInvasionEncounter[];
}

/** 現在ボス一覧ではなく、Raid Level 1 / Mega / Shadow等のレベル定義。 */
export interface WatWowMapRaidLevelDefinition {
  id: number;
  formatted: string;
  proto: string;
}

export interface WatWowMapType {
  typeId: number;
  typeName: string;
  strengths: number[];
  weaknesses: number[];
  veryWeakAgainst: number[];
  immunes: number[];
  weakAgainst: number[];
  resistances: number[];
}

export interface WatWowMapWeather {
  weatherId: number;
  weatherName: string;
  proto: string;
  types: number[];
}

export interface WatWowMapQuestDefinition {
  questId: number;
  proto: string;
  formatted: string;
}

export type WatWowMapTranslationCategory =
  | 'bonuses'
  | 'character-categories'
  | 'costumes'
  | 'descriptions'
  | 'evolution-quests'
  | 'forms'
  | 'grunt-quotes'
  | 'grunts'
  | 'items'
  | 'lures'
  | 'misc'
  | 'moves'
  | 'pokemon-categories'
  | 'pokemon'
  | 'quest-conditions'
  | 'quest-reward-types'
  | 'quest-titles'
  | 'quest-types'
  | 'types'
  | 'weather';

export type WatWowMapTranslationEntries = Record<string, string>;
export type WatWowMapTranslationLocale = Partial<
  Record<WatWowMapTranslationCategory, WatWowMapTranslationEntries>
>;
