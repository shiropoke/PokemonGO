import { describe, expect, it } from 'vitest';
import generatedMetadata from '../../public/data/unified/meta.json';
import generatedMoves from '../../public/data/unified/moves.json';
import generatedPokemon from '../../public/data/unified/pokemon.json';
import {
  parseUnifiedMetadata,
  parseUnifiedMoveDataset,
  parseUnifiedPokemonDataset,
} from './unifiedGameData';

describe('checked-in Unified Data fallback', () => {
  it('3分割JSONが整合し、重複・orphan referenceがない', () => {
    const parsedPokemon = parseUnifiedPokemonDataset(generatedPokemon);
    const parsedMoves = parseUnifiedMoveDataset(generatedMoves);
    const parsedMetadata = parseUnifiedMetadata(generatedMetadata);
    const pokemonKeys = new Set(parsedPokemon.pokemon.map((entry) => entry.key));
    const moveKeys = new Set(parsedMoves.moves.map((entry) => entry.key));

    expect(parsedPokemon.pokemon.length).toBe(parsedMetadata.counts.pokemon);
    expect(parsedMoves.moves.length).toBe(parsedMetadata.counts.moves);
    expect(pokemonKeys.size).toBe(parsedPokemon.pokemon.length);
    expect(moveKeys.size).toBe(parsedMoves.moves.length);

    const orphanMoves = parsedPokemon.pokemon.flatMap((entry) => [
      ...entry.moves.fast,
      ...entry.moves.charged,
      ...entry.moves.eliteFast,
      ...entry.moves.eliteCharged,
    ]).filter((key) => !moveKeys.has(key));
    const orphanEvolutions = parsedPokemon.pokemon
      .flatMap((entry) => entry.evolutions)
      .filter((evolution) => evolution.targetKey && !pokemonKeys.has(evolution.targetKey));
    expect(orphanMoves).toEqual([]);
    expect(orphanEvolutions).toEqual([]);
  });
});
