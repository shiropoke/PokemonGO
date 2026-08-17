import { describe, expect, it } from 'vitest';
import {
  calculateDpe,
  calculateDps,
  calculateEps,
  calculatePerTurn,
  gameMasterDurationToTurns,
} from './moveMetrics';

describe('move metrics', () => {
  it('calculates PvE DPS and EPS from milliseconds', () => {
    expect(calculateDps(4, 500)).toBe(8);
    expect(calculateEps(7, 500)).toBe(14);
  });

  it('converts Game Master durationTurns and calculates PvP ratios', () => {
    const turns = gameMasterDurationToTurns(1);
    expect(turns).toBe(2);
    expect(calculatePerTurn(4, turns ?? 0)).toBe(2);
    expect(calculatePerTurn(9, turns ?? 0)).toBe(4.5);
    expect(calculateDpe(60, -45)).toBeCloseTo(1.3333333333);
  });
});
