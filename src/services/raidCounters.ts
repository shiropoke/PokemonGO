import { fetchGameData, getMove, getPokemonGameData } from './gameData';
import { fetchPokemonData } from './pokemonData';
import type { GameData, GameMoveData } from '../types/gameData';
import type {
  RaidCounterAttacker,
  RaidCounterMove,
} from '../utils/raidCounters';

let attackerPromise: Promise<RaidCounterAttacker[]> | null = null;

function toCounterMove(
  move: GameMoveData | undefined,
  elite: boolean,
): RaidCounterMove | null {
  const power = move?.pve?.power;
  const durationMs = move?.pve?.durationMs;
  const energyDelta = move?.pve?.energyDelta;
  if (
    !move ||
    typeof power !== 'number' ||
    typeof durationMs !== 'number' ||
    typeof energyDelta !== 'number'
  ) {
    return null;
  }
  return {
    id: move.id,
    name: move.name,
    type: move.type,
    power,
    durationMs,
    energyDelta,
    elite,
  };
}

function movesForIds(
  data: GameData,
  regularIds: readonly string[],
  eliteIds: readonly string[],
): RaidCounterMove[] {
  const eliteSet = new Set(eliteIds);
  return [...new Set([...regularIds, ...eliteIds])]
    .map((id) => toCounterMove(getMove(data, id), eliteSet.has(id)))
    .filter((move): move is RaidCounterMove => move !== null);
}

async function requestAttackers(force: boolean): Promise<RaidCounterAttacker[]> {
  const [pokemonResult, gameData] = await Promise.all([
    fetchPokemonData({ force }),
    fetchGameData({ force }),
  ]);

  return pokemonResult.pokemon.flatMap((pokemon) => {
    const gamePokemon = getPokemonGameData(gameData, pokemon.speciesId);
    if (!gamePokemon) return [];
    const fastMoves = movesForIds(
      gameData,
      gamePokemon.fastMoveIds,
      gamePokemon.eliteFastMoveIds,
    );
    const chargedMoves = movesForIds(
      gameData,
      gamePokemon.chargedMoveIds,
      gamePokemon.eliteChargedMoveIds,
    );
    if (fastMoves.length === 0 || chargedMoves.length === 0) return [];

    return [{
      speciesId: pokemon.speciesId,
      displayName: pokemon.displayName,
      baseStats: pokemon.baseStats,
      types: gamePokemon.types,
      tags: pokemon.tags,
      isShadow: pokemon.isShadow,
      fastMoves,
      chargedMoves,
    }];
  });
}

/** 軽量Game Masterと既存日本語Pokémonデータを一度だけ結合します。 */
export function fetchRaidCounterAttackers(
  options: { force?: boolean } = {},
): Promise<RaidCounterAttacker[]> {
  if (!options.force && attackerPromise) return attackerPromise;
  const request = requestAttackers(options.force === true);
  if (options.force) return request;
  attackerPromise = request.catch((error) => {
    attackerPromise = null;
    throw error;
  });
  return attackerPromise;
}
