import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../types/pokemon';
import { getEvolutionDescendants, type EvolutionGraphData } from './evolutionChain';

function pokemon(speciesId: string, dex: number): Pokemon {
  return {
    dex,
    speciesId,
    speciesName: speciesId,
    displayName: speciesId,
    baseStats: { atk: 100 + dex, def: 100 + dex, hp: 100 + dex },
    released: true,
    tags: [],
    isShadow: false,
  };
}

const BULBASAUR = pokemon('bulbasaur', 1);
const IVYSAUR = pokemon('ivysaur', 2);
const VENUSAUR = pokemon('venusaur', 3);
const VAPOREON = pokemon('vaporeon', 134);
const JOLTEON = pokemon('jolteon', 135);

const pokemonById = new Map(
  [BULBASAUR, IVYSAUR, VENUSAUR, VAPOREON, JOLTEON].map((entry) => [entry.speciesId, entry]),
);

const linearGameData: EvolutionGraphData = {
  pokemon: {
    bulbasaur: { evolutions: [{ speciesId: 'ivysaur' }] },
    ivysaur: { evolutions: [{ speciesId: 'venusaur' }] },
    venusaur: { evolutions: [] },
  },
};

describe('evolution descendants', () => {
  it('returns every later stage in evolution-stage order', () => {
    expect(getEvolutionDescendants('bulbasaur', linearGameData, pokemonById)).toEqual([
      { speciesId: 'ivysaur', depth: 1, pokemon: IVYSAUR },
      { speciesId: 'venusaur', depth: 2, pokemon: VENUSAUR },
    ]);
  });

  it('does not include pre-evolutions for an intermediate stage', () => {
    expect(getEvolutionDescendants('ivysaur', linearGameData, pokemonById)).toEqual([
      { speciesId: 'venusaur', depth: 1, pokemon: VENUSAUR },
    ]);
  });

  it('returns no descendants for a final evolution', () => {
    expect(getEvolutionDescendants('venusaur', linearGameData, pokemonById)).toEqual([]);
  });

  it('preserves branch order, removes duplicates, and terminates cyclic data', () => {
    const branchedAndCyclic: EvolutionGraphData = {
      pokemon: {
        eevee: {
          evolutions: [
            { speciesId: 'vaporeon' },
            { speciesId: 'jolteon' },
            { speciesId: 'vaporeon' },
          ],
        },
        vaporeon: { evolutions: [{ speciesId: 'eevee' }] },
        jolteon: { evolutions: [{ speciesId: 'vaporeon' }] },
      },
    };

    expect(getEvolutionDescendants('eevee', branchedAndCyclic, pokemonById).map(({ speciesId }) => speciesId))
      .toEqual(['vaporeon', 'jolteon']);
  });
});
