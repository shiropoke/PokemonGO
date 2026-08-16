import { describe, expect, it } from 'vitest';
import {
  CP_MULTIPLIERS,
  MAX_POKEMON_LEVEL,
  MIN_POKEMON_LEVEL,
} from '../data/cpMultipliers';
import {
  calculateCp,
  findMatchingLevels,
  getCpMultiplier,
  getEffectiveLevelCap,
  getLevels,
} from './cp';

const MEWTWO = { atk: 300, def: 182, hp: 214 };
const PERFECT = { attack: 15, defense: 15, hp: 15 };

describe('CP calculations', () => {
  it('contains every exact half level from PL1 through PL51', () => {
    expect(CP_MULTIPLIERS).toHaveLength(101);
    expect(getLevels()).toHaveLength(101);
    expect(getLevels()[0]).toBe(MIN_POKEMON_LEVEL);
    expect(getLevels().at(-1)).toBe(MAX_POKEMON_LEVEL);
    expect(getCpMultiplier(1)).toBeCloseTo(0.0939999967813491, 15);
    expect(getCpMultiplier(51)).toBeCloseTo(0.845300018787384, 15);
  });

  it('matches the established perfect Mewtwo PL40 CP', () => {
    expect(calculateCp(MEWTWO, PERFECT, 40)).toBe(4178);
  });

  it('never returns a CP below 10', () => {
    expect(
      calculateCp(
        { atk: 1, def: 1, hp: 1 },
        { attack: 0, defense: 0, hp: 0 },
        1,
      ),
    ).toBe(10);
  });

  it('resolves PL40/PL50 and buddy boost caps correctly', () => {
    expect(getEffectiveLevelCap(40, false)).toBe(40);
    expect(getEffectiveLevelCap(40, true)).toBe(41);
    expect(getEffectiveLevelCap(50, false)).toBe(50);
    expect(getEffectiveLevelCap(50, true)).toBe(51);
  });

  it('finds all possible half-levels for an entered CP without exceeding the cap', () => {
    const targetCp = calculateCp(MEWTWO, PERFECT, 23.5);
    const matches = findMatchingLevels(MEWTWO, PERFECT, targetCp, 40);

    expect(matches).toContain(23.5);
    expect(matches.every((level) => level <= 40)).toBe(true);
    expect(
      matches.every((level) => calculateCp(MEWTWO, PERFECT, level) === targetCp),
    ).toBe(true);
  });
});
