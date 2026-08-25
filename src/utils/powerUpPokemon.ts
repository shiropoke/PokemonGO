import type { Pokemon } from '../types/pokemon';

export function getPowerUpSelectablePokemon(
  pokemon: readonly Pokemon[],
): Pokemon[] {
  return pokemon.filter((entry) => !entry.isShadow);
}

function hasSameBaseStats(left: Pokemon, right: Pokemon): boolean {
  return left.baseStats.atk === right.baseStats.atk
    && left.baseStats.def === right.baseStats.def
    && left.baseStats.hp === right.baseStats.hp;
}

/**
 * 強化コストではShadow状態をチェックボックスで管理するため、URLで受け取った
 * Shadow種を、同じフォルムの通常種へ安全に戻します。
 */
export function resolvePowerUpSpeciesId(
  requestedSpeciesId: string | null,
  pokemon: readonly Pokemon[],
): string | null {
  if (!requestedSpeciesId) return null;

  const requested = pokemon.find((entry) => entry.speciesId === requestedSpeciesId);
  if (!requested) return null;
  if (!requested.isShadow) return requested.speciesId;

  const expectedNormalId = requested.speciesId.endsWith('_shadow')
    ? requested.speciesId.slice(0, -'_shadow'.length)
    : null;
  const exactNormal = expectedNormalId
    ? pokemon.find((entry) => entry.speciesId === expectedNormalId && !entry.isShadow)
    : undefined;
  if (exactNormal && exactNormal.dex === requested.dex && hasSameBaseStats(exactNormal, requested)) {
    return exactNormal.speciesId;
  }

  const sameFormCandidates = pokemon.filter(
    (entry) => !entry.isShadow
      && entry.dex === requested.dex
      && entry.form === requested.form
      && hasSameBaseStats(entry, requested),
  );
  return sameFormCandidates.length === 1 ? sameFormCandidates[0]?.speciesId ?? null : null;
}
