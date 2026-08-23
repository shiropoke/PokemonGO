import { TYPE_LABELS_JA, isPokemonType } from '../constants/typeMeta';
import { POKEMON_TYPES } from '../types/gameData';
import type {
  PokemonType,
  TypeEffectivenessChart,
} from '../types/gameData';

export { TYPE_LABELS_JA } from '../constants/typeMeta';

export interface TypeMatchup {
  type: PokemonType;
  multiplier: number;
}

export interface TypeWeakness extends TypeMatchup {
  label: string;
}

const SUPER_EFFECTIVE: Readonly<Partial<Record<PokemonType, readonly PokemonType[]>>> = {
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'],
  grass: ['water', 'ground', 'rock'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
};

const NOT_VERY_EFFECTIVE: Readonly<Partial<Record<PokemonType, readonly PokemonType[]>>> = {
  normal: ['rock', 'steel'],
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  electric: ['electric', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  ice: ['fire', 'water', 'ice', 'steel'],
  fighting: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
  poison: ['poison', 'ground', 'rock', 'ghost'],
  ground: ['grass', 'bug'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel'],
  bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark'],
  dragon: ['steel'],
  dark: ['fighting', 'dark', 'fairy'],
  steel: ['fire', 'water', 'electric', 'steel'],
  fairy: ['fire', 'poison', 'steel'],
};

const IMMUNE: Readonly<Partial<Record<PokemonType, readonly PokemonType[]>>> = {
  normal: ['ghost'],
  electric: ['ground'],
  fighting: ['ghost'],
  poison: ['steel'],
  ground: ['flying'],
  psychic: ['dark'],
  ghost: ['normal'],
  dragon: ['fairy'],
};

/** 同期表示用のPokémon GO標準タイプ倍率。Game Masterのチャートと同じ値です。 */
export function getTypeEffectiveness(
  attackType: PokemonType | string,
  defenderTypes: readonly string[],
): number {
  const attack = attackType.toLowerCase();
  if (!isPokemonType(attack)) return 1;
  return defenderTypes.reduce((total, rawDefender) => {
    const defender = rawDefender.toLowerCase();
    if (!isPokemonType(defender)) return total;
    if (IMMUNE[attack]?.includes(defender)) return total * 0.390625;
    if (SUPER_EFFECTIVE[attack]?.includes(defender)) return total * 1.6;
    if (NOT_VERY_EFFECTIVE[attack]?.includes(defender)) return total * 0.625;
    return total;
  }, 1);
}

/** チャート読込前のカードでも使える、弱点ラベル付きの同期ヘルパー。 */
export function getTypeWeaknesses(
  defenderTypes: readonly string[],
): TypeWeakness[] {
  return POKEMON_TYPES.map((type) => ({
    type,
    label: TYPE_LABELS_JA[type],
    multiplier: getTypeEffectiveness(type, defenderTypes),
  }))
    .filter(({ multiplier }) => multiplier > 1)
    .sort(
      (left, right) =>
        right.multiplier - left.multiplier || left.type.localeCompare(right.type, 'en'),
    );
}

/** 複数の相手に弱点を突ける件数と倍率合計だけで、対策タイプを並べます。 */
export function rankCounterTypes(
  defenderTypeSets: readonly (readonly string[])[],
  limit = 4,
): TypeWeakness[] {
  if (defenderTypeSets.length === 0) return [];

  return POKEMON_TYPES.map((type) => {
    const multipliers = defenderTypeSets.map((types) =>
      getTypeEffectiveness(type, types),
    );
    return {
      type,
      label: TYPE_LABELS_JA[type],
      multiplier: multipliers.reduce((sum, value) => sum + value, 0),
      weakCount: multipliers.filter((value) => value > 1).length,
    };
  })
    .filter(({ weakCount }) => weakCount > 0)
    .sort(
      (left, right) =>
        right.weakCount - left.weakCount ||
        right.multiplier - left.multiplier ||
        left.type.localeCompare(right.type, 'en'),
    )
    .slice(0, Math.max(0, limit))
    .map(({ type, label, multiplier }) => ({ type, label, multiplier }));
}

export function getTypeMultiplier(
  attackType: PokemonType,
  defenderTypes: readonly PokemonType[],
  chart: TypeEffectivenessChart,
): number {
  return defenderTypes.reduce(
    (multiplier, defenderType) => multiplier * chart[attackType][defenderType],
    1,
  );
}

export function getWeaknesses(
  defenderTypes: readonly PokemonType[],
  chart: TypeEffectivenessChart,
): TypeMatchup[] {
  return (Object.keys(chart) as PokemonType[])
    .map((type) => ({
      type,
      multiplier: getTypeMultiplier(type, defenderTypes, chart),
    }))
    .filter(({ multiplier }) => multiplier > 1)
    .sort(
      (left, right) =>
        right.multiplier - left.multiplier || left.type.localeCompare(right.type, 'en'),
    );
}

export function getResistances(
  defenderTypes: readonly PokemonType[],
  chart: TypeEffectivenessChart,
): TypeMatchup[] {
  return (Object.keys(chart) as PokemonType[])
    .map((type) => ({
      type,
      multiplier: getTypeMultiplier(type, defenderTypes, chart),
    }))
    .filter(({ multiplier }) => multiplier < 1)
    .sort(
      (left, right) =>
        left.multiplier - right.multiplier || left.type.localeCompare(right.type, 'en'),
    );
}
