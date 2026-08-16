import { describe, expect, it } from 'vitest';
import { calculateIvSummary, getStarRating } from './iv';

describe('IV appraisal', () => {
  it('calculates 15/15/15 as exactly 100% and 4★', () => {
    expect(calculateIvSummary({ attack: 15, defense: 15, hp: 15 })).toEqual({
      total: 45,
      percentage: 100,
      stars: 4,
      gradeLabel: '4★ / PERFECT',
    });
  });

  it('calculates 0/0/0 as exactly 0% and 0★', () => {
    expect(calculateIvSummary({ attack: 0, defense: 0, hp: 0 })).toEqual({
      total: 0,
      percentage: 0,
      stars: 0,
      gradeLabel: '0★',
    });
  });

  it('uses integer IV totals at every appraisal boundary', () => {
    expect(getStarRating(22)).toBe(0);
    expect(getStarRating(23)).toBe(1);
    expect(getStarRating(29)).toBe(1);
    expect(getStarRating(30)).toBe(2);
    expect(getStarRating(36)).toBe(2);
    expect(getStarRating(37)).toBe(3);
    expect(getStarRating(44)).toBe(3);
    expect(getStarRating(45)).toBe(4);
  });
});
