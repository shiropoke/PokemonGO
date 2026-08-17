import { describe, expect, it } from 'vitest';
import { calculateEvolutionCp } from './evolutionCp';

describe('evolution CP calculation', () => {
  it('keeps level and IVs unchanged and uses the evolved base stats', () => {
    const result = calculateEvolutionCp(
      { atk: 118, def: 111, hp: 128 },
      { atk: 151, def: 143, hp: 155 },
      { attack: 15, defense: 15, hp: 15 },
      20,
    );

    expect(result).toEqual({ level: 20, sourceCp: 637, evolvedCp: 970 });
  });
});
