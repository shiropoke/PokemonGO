import { beforeEach, describe, expect, it } from 'vitest';
import type { Pokemon } from '../types/pokemon';
import type { EvolutionDescendant } from './evolutionChain';
import { calculateEvolutionPvpResults } from './evolutionPvp';
import { clearPvpRankingCache } from './pvp';

const IVS = { attack: 0, defense: 15, hp: 14 } as const;

const EVOLVED_POKEMON: Pokemon = {
  dex: 26,
  speciesId: 'raichu',
  speciesName: 'Raichu',
  displayName: 'ライチュウ',
  baseStats: { atk: 193, def: 151, hp: 155 },
  released: true,
  tags: [],
  isShadow: false,
};

const DESCENDANTS: EvolutionDescendant[] = [
  { speciesId: EVOLVED_POKEMON.speciesId, depth: 1, pokemon: EVOLVED_POKEMON },
];

beforeEach(() => clearPvpRankingCache());

describe('evolution PvP ranking', () => {
  it('uses the same IVs for all three leagues and ranks against 4096 combinations', () => {
    const [result] = calculateEvolutionPvpResults(DESCENDANTS, IVS, 50);

    expect(result).toBeDefined();
    expect(result?.calculationError).toBe(false);
    expect(result?.pvpResults.great?.ivs).toEqual(IVS);
    expect(result?.pvpResults.ultra?.ivs).toEqual(IVS);
    expect(result?.pvpResults.master?.ivs).toEqual(IVS);
    expect(result?.pvpResults.great?.total).toBe(4096);
    expect(result?.pvpResults.ultra?.total).toBe(4096);
    expect(result?.pvpResults.master?.total).toBe(4096);
    expect(result?.pvpResults.great?.cp).toBeLessThanOrEqual(1500);
    expect(result?.pvpResults.ultra?.cp).toBeLessThanOrEqual(2500);
  });

  it.each([40, 41, 50, 51])('applies effective PL cap %s to Master League', (levelCap) => {
    const [result] = calculateEvolutionPvpResults(DESCENDANTS, IVS, levelCap);
    expect(result?.pvpResults.master?.level).toBe(levelCap);
  });
});
