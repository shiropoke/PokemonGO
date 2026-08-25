import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../types/pokemon';
import {
  getPowerUpSelectablePokemon,
  resolvePowerUpSpeciesId,
} from './powerUpPokemon';

function pokemon(
  speciesId: string,
  options: Partial<Pokemon> = {},
): Pokemon {
  return {
    dex: 19,
    speciesId,
    speciesName: speciesId,
    displayName: speciesId,
    baseStats: { atk: 103, def: 70, hp: 102 },
    released: true,
    tags: [],
    isShadow: false,
    ...options,
  };
}

const entries = [
  pokemon('rattata'),
  pokemon('rattata_shadow', {
    displayName: 'コラッタ（シャドウ）',
    tags: ['shadow'],
    isShadow: true,
  }),
  pokemon('rattata_alolan', {
    displayName: 'コラッタ（アローラのすがた）',
    form: 'アローラのすがた',
  }),
  pokemon('rattata_alolan_shadow', {
    displayName: 'コラッタ（アローラのすがた）（シャドウ）',
    form: 'アローラのすがた',
    tags: ['shadow'],
    isShadow: true,
  }),
];

describe('power-up Pokemon selection', () => {
  it('Shadow候補だけを除外し、通常フォルム違いは維持する', () => {
    expect(getPowerUpSelectablePokemon(entries).map((entry) => entry.speciesId))
      .toEqual(['rattata', 'rattata_alolan']);
  });

  it('URLのShadow種を同じ通常フォルムへ変換する', () => {
    expect(resolvePowerUpSpeciesId('rattata_shadow', entries)).toBe('rattata');
    expect(resolvePowerUpSpeciesId('rattata_alolan_shadow', entries)).toBe('rattata_alolan');
  });

  it('対応先を安全に確認できない場合は選択を解除する', () => {
    const unknownShadow = pokemon('custom_shadow', {
      dex: 999,
      tags: ['shadow'],
      isShadow: true,
    });
    expect(resolvePowerUpSpeciesId('custom_shadow', [...entries, unknownShadow])).toBeNull();
  });
});
