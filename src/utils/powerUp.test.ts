import { describe, expect, it } from 'vitest';
import type { PowerUpCostData } from '../types/gameData';
import { calculatePowerUpCost, resolvePowerUpCostData } from './powerUp';

const POWER_UP_DATA: PowerUpCostData = {
  upgradesPerLevel: 2,
  maxLevel: 50,
  stardustCostByLevel: [
    200, 200, 400, 400, 600, 600, 800, 800, 1000, 1000,
    1300, 1300, 1600, 1600, 1900, 1900, 2200, 2200, 2500, 2500,
    3000, 3000, 3500, 3500, 4000, 4000, 4500, 4500, 5000, 5000,
    6000, 6000, 7000, 7000, 8000, 8000, 9000, 9000, 10000, 10000,
    11000, 11000, 12000, 12000, 13000, 13000, 14000, 14000, 15000,
  ],
  candyCostByLevel: [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 4, 4, 4, 4, 4,
    6, 6, 8, 8, 10, 10, 12, 12, 15, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  xlCandyCostFromLevel40: [10, 10, 12, 12, 15, 15, 17, 17, 20, 20],
  modifiers: {
    luckyStardust: 0.5,
    shadowStardust: 1.2,
    shadowCandy: 1.2,
    purifiedStardust: 0.9,
    purifiedCandy: 0.9,
  },
  overrides: {
    special: {
      maxLevel: 50,
      stardustCostByLevel: Array.from({ length: 49 }, () => 1000),
      candyCostByLevel: Array.from({ length: 50 }, () => 30),
      xlCandyCostFromLevel40: Array.from({ length: 10 }, () => 100),
    },
  },
};

const NORMAL = { lucky: false, shadow: false, purified: false };

describe('power-up costs', () => {
  it('returns zero when current and target levels are equal', () => {
    expect(calculatePowerUpCost(POWER_UP_DATA, 40, 40, NORMAL)).toMatchObject({
      powerUps: 0,
      stardust: 0,
      candy: 0,
      candyXl: 0,
    });
  });

  it('rejects a target below the current level', () => {
    expect(() => calculatePowerUpCost(POWER_UP_DATA, 40, 39.5, NORMAL)).toThrow(
      '目標PLは現在PL以上',
    );
  });

  it('matches the Game Master PL40 to PL50 total', () => {
    expect(calculatePowerUpCost(POWER_UP_DATA, 40, 50, NORMAL)).toMatchObject({
      powerUps: 20,
      stardust: 250000,
      candy: 0,
      candyXl: 296,
    });
  });

  it('uses an explicitly supplied species override without changing modifiers', () => {
    const resolved = resolvePowerUpCostData(POWER_UP_DATA, 'special');
    expect(resolved.candyCostByLevel[0]).toBe(30);
    expect(resolved.modifiers).toBe(POWER_UP_DATA.modifiers);
  });
});
