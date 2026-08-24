import type { Pokemon } from '../types/pokemon';

export interface EvolutionDescendant {
  speciesId: string;
  depth: number;
  pokemon: Pokemon;
}

export interface EvolutionGraphData {
  pokemon: Record<string, { evolutions: readonly { speciesId: string }[] } | undefined>;
}

/**
 * Game Master の並びを保ちながら、現在の種族から到達できる進化先を
 * 進化段階順に返す。visited は重複表示と不正な循環データの両方を防ぐ。
 */
export function getEvolutionDescendants(
  speciesId: string,
  gameData: EvolutionGraphData,
  pokemonById: ReadonlyMap<string, Pokemon>,
): EvolutionDescendant[] {
  const visited = new Set<string>([speciesId]);
  const descendants: Array<EvolutionDescendant & { discoveryOrder: number }> = [];

  const visit = (currentSpeciesId: string, depth: number): void => {
    const evolutions = gameData.pokemon[currentSpeciesId]?.evolutions ?? [];

    for (const evolution of evolutions) {
      const nextSpeciesId = evolution.speciesId.trim();
      if (!nextSpeciesId || visited.has(nextSpeciesId)) continue;

      visited.add(nextSpeciesId);
      const pokemon = pokemonById.get(nextSpeciesId);
      if (pokemon) {
        descendants.push({
          speciesId: nextSpeciesId,
          depth,
          pokemon,
          discoveryOrder: descendants.length,
        });
      }

      // Pokémon基礎データが欠けていても、その先の進化は探索する。
      visit(nextSpeciesId, depth + 1);
    }
  };

  visit(speciesId, 1);

  return descendants
    .sort((left, right) => left.depth - right.depth || left.discoveryOrder - right.discoveryOrder)
    .map(({ discoveryOrder: _discoveryOrder, ...descendant }) => descendant);
}
