import type { PowerUpCostData } from '../types/gameData';

export interface PowerUpOptions {
  lucky: boolean;
  shadow: boolean;
  purified: boolean;
}

export interface PowerUpCostResult {
  currentLevel: number;
  targetLevel: number;
  powerUps: number;
  stardust: number;
  candy: number;
  candyXl: number;
}

export function resolvePowerUpCostData(
  data: PowerUpCostData,
  speciesId?: string | null,
): PowerUpCostData {
  const override = speciesId ? data.overrides[speciesId] : undefined;
  return override ? { ...data, ...override } : data;
}

const LEVEL_STEP = 0.5;

function isHalfLevel(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value * 2);
}

function adjustedCost(baseCost: number, multiplier: number): number {
  // Game resources are integer counts; modifiers are applied to each power-up action.
  return Math.ceil(baseCost * multiplier);
}

export function calculatePowerUpCost(
  data: PowerUpCostData,
  currentLevel: number,
  targetLevel: number,
  options: PowerUpOptions = { lucky: false, shadow: false, purified: false },
): PowerUpCostResult {
  if (
    !isHalfLevel(currentLevel) ||
    !isHalfLevel(targetLevel) ||
    currentLevel < 1 ||
    targetLevel > data.maxLevel
  ) {
    throw new RangeError(`PLは1から${data.maxLevel}まで0.5刻みで指定してください。`);
  }
  if (targetLevel < currentLevel) {
    throw new RangeError('目標PLは現在PL以上にしてください。');
  }
  if (options.shadow && options.purified) {
    throw new RangeError('シャドウとライトは同時に選択できません。');
  }

  const formStardustMultiplier = options.shadow
    ? data.modifiers.shadowStardust
    : options.purified
      ? data.modifiers.purifiedStardust
      : 1;
  const formCandyMultiplier = options.shadow
    ? data.modifiers.shadowCandy
    : options.purified
      ? data.modifiers.purifiedCandy
      : 1;
  const stardustMultiplier =
    formStardustMultiplier * (options.lucky ? data.modifiers.luckyStardust : 1);

  let stardust = 0;
  let candy = 0;
  let candyXl = 0;
  let powerUps = 0;
  for (let level = currentLevel; level < targetLevel; level += LEVEL_STEP) {
    const integerLevel = Math.floor(level);
    const costIndex = integerLevel - 1;
    const baseStardust = data.stardustCostByLevel[costIndex];
    if (baseStardust === undefined) {
      throw new RangeError(`PL${level}のほしのすなコストがありません。`);
    }
    stardust += adjustedCost(baseStardust, stardustMultiplier);

    if (level >= 40) {
      const baseXlCandy = data.xlCandyCostFromLevel40[integerLevel - 40];
      if (baseXlCandy === undefined) {
        throw new RangeError(`PL${level}のアメXLコストがありません。`);
      }
      candyXl += adjustedCost(baseXlCandy, formCandyMultiplier);
    } else {
      const baseCandy = data.candyCostByLevel[costIndex];
      if (baseCandy === undefined) {
        throw new RangeError(`PL${level}のアメコストがありません。`);
      }
      candy += adjustedCost(baseCandy, formCandyMultiplier);
    }
    powerUps += 1;
  }

  return { currentLevel, targetLevel, powerUps, stardust, candy, candyXl };
}
