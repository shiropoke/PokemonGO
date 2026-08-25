import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../types/pokemon';
import { eventTitleMentionsPokemon, externalPokemonMatches } from './pokemonMatching';

const mew: Pokemon = {
  dex: 151,
  speciesId: 'mew',
  speciesName: 'Mew',
  displayName: 'ミュウ',
  baseStats: { atk: 210, def: 210, hp: 225 },
  released: true,
  tags: [],
  isShadow: false,
};

describe('pokemon matching', () => {
  it('matches whole English Pokemon names in event titles', () => {
    expect(eventTitleMentionsPokemon('Mew Raid Day', mew)).toBe(true);
    expect(eventTitleMentionsPokemon('Mewtwo Raid Hour', mew)).toBe(false);
  });

  it('uses the shared external-name resolver', () => {
    expect(externalPokemonMatches('Mew', null, mew)).toBe(true);
    expect(externalPokemonMatches('Mewtwo', null, mew)).toBe(false);
  });
});
