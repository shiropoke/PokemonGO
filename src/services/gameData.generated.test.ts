import { describe, expect, it } from 'vitest';
import generatedGameData from '../../public/data/game-data.json';
import { parseGameData } from './gameData';

describe('generated lightweight Game Master data', () => {
  const data = parseGameData(generatedGameData);

  it('includes temporary evolutions backed by PokeMiners overrides', () => {
    const temporaryIds = Object.keys(data.pokemon).filter(
      (speciesId) => speciesId.includes('_mega') || speciesId.includes('_primal'),
    );

    expect(temporaryIds.length).toBeGreaterThan(0);
    expect(data.pokemon.venusaur_mega?.types).toEqual(['grass', 'poison']);
    expect(data.pokemon.charizard_mega_x?.types).toEqual(['fire', 'dragon']);
    expect(data.pokemon.groudon_primal?.types).toEqual(['ground', 'fire']);
    expect(data.pokemon.kyogre_primal?.types).toEqual(['water']);
  });

  it('inherits the GM move pool and removes an absent second type', () => {
    expect(data.pokemon.venusaur_mega?.fastMoveIds).toContain('VINE_WHIP_FAST');
    expect(data.pokemon.venusaur_mega?.eliteChargedMoveIds).toContain('FRENZY_PLANT');
    expect(data.pokemon.aggron_mega?.types).toEqual(['steel']);
  });
});
