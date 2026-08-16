import {
  MAX_POKEMON_LEVEL,
  MIN_POKEMON_LEVEL,
  POKEMON_LEVELS,
  cpMultiplierForLevel,
} from '../data/cpMultipliers';
import type {
  BaseStats,
  BattleStats,
  IndividualValues,
  StandardMaxLevel,
} from '../types/calculations';
import { isValidIndividualValues } from './iv';

export function isValidBaseStats(value: unknown): value is BaseStats {
  if (value === null || typeof value !== 'object') return false;
  const baseStats = value as Partial<BaseStats>;
  return (
    Number.isFinite(baseStats.atk) &&
    Number.isFinite(baseStats.def) &&
    Number.isFinite(baseStats.hp) &&
    (baseStats.atk as number) > 0 &&
    (baseStats.def as number) > 0 &&
    (baseStats.hp as number) > 0
  );
}

function assertCalculationInputs(
  baseStats: BaseStats,
  ivs: IndividualValues,
): void {
  if (!isValidBaseStats(baseStats)) {
    throw new RangeError('Base stats must contain positive finite atk, def and hp values.');
  }
  if (!isValidIndividualValues(ivs)) {
    throw new RangeError('Individual values must be integers from 0 through 15.');
  }
}

function assertLevelRange(minLevel: number, maxLevel: number): void {
  // cpMultiplierForLevel performs the exact 0.5-step validation.
  cpMultiplierForLevel(minLevel);
  cpMultiplierForLevel(maxLevel);
  if (minLevel > maxLevel) {
    throw new RangeError('Minimum level cannot be greater than maximum level.');
  }
}

export function getCpMultiplier(level: number): number {
  return cpMultiplierForLevel(level);
}

export function getEffectiveLevelCap(
  maxLevel: StandardMaxLevel,
  buddyBoost: boolean,
): 40 | 41 | 50 | 51 {
  if (maxLevel !== 40 && maxLevel !== 50) {
    throw new RangeError('Maximum level must be either 40 or 50.');
  }

  if (maxLevel === 40) return buddyBoost ? 41 : 40;
  return buddyBoost ? 51 : 50;
}

export function getLevels(
  maxLevel = MAX_POKEMON_LEVEL,
  minLevel = MIN_POKEMON_LEVEL,
): number[] {
  assertLevelRange(minLevel, maxLevel);
  return POKEMON_LEVELS.filter(
    (level) => level >= minLevel && level <= maxLevel,
  );
}

export function calculateCp(
  baseStats: BaseStats,
  ivs: IndividualValues,
  level: number,
): number {
  assertCalculationInputs(baseStats, ivs);
  const multiplier = cpMultiplierForLevel(level);
  const rawCp =
    ((baseStats.atk + ivs.attack) *
      Math.sqrt(baseStats.def + ivs.defense) *
      Math.sqrt(baseStats.hp + ivs.hp) *
      multiplier ** 2) /
    10;

  return Math.max(10, Math.floor(rawCp));
}

export function calculateHp(
  baseStats: BaseStats,
  ivs: IndividualValues,
  level: number,
): number {
  assertCalculationInputs(baseStats, ivs);
  const multiplier = cpMultiplierForLevel(level);
  return Math.floor((baseStats.hp + ivs.hp) * multiplier);
}

export function calculateBattleStats(
  baseStats: BaseStats,
  ivs: IndividualValues,
  level: number,
): BattleStats {
  assertCalculationInputs(baseStats, ivs);
  const multiplier = cpMultiplierForLevel(level);
  const attack = (baseStats.atk + ivs.attack) * multiplier;
  const defense = (baseStats.def + ivs.defense) * multiplier;
  const hp = Math.floor((baseStats.hp + ivs.hp) * multiplier);

  return {
    level,
    cp: calculateCp(baseStats, ivs, level),
    attack,
    defense,
    hp,
    statProduct: attack * defense * hp,
  };
}

export function findMatchingLevels(
  baseStats: BaseStats,
  ivs: IndividualValues,
  targetCp: number,
  maxLevel = MAX_POKEMON_LEVEL,
  minLevel = MIN_POKEMON_LEVEL,
): number[] {
  assertCalculationInputs(baseStats, ivs);
  assertLevelRange(minLevel, maxLevel);
  if (!Number.isInteger(targetCp) || targetCp < 10) return [];

  return getLevels(maxLevel, minLevel).filter(
    (level) => calculateCp(baseStats, ivs, level) === targetCp,
  );
}

export function findHighestLevelAtOrBelowCp(
  baseStats: BaseStats,
  ivs: IndividualValues,
  cpCap: number,
  maxLevel: number,
  minLevel = MIN_POKEMON_LEVEL,
): BattleStats | null {
  assertCalculationInputs(baseStats, ivs);
  assertLevelRange(minLevel, maxLevel);
  if (!Number.isFinite(cpCap) || cpCap < 10) return null;

  const levels = getLevels(maxLevel, minLevel);
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const level = levels[index];
    if (level === undefined) continue;
    const stats = calculateBattleStats(baseStats, ivs, level);
    if (stats.cp <= cpCap) return stats;
  }

  return null;
}
