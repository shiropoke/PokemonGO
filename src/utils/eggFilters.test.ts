import { describe, expect, it } from 'vitest';
import type { EggHatch } from '../types/scrapedDuck';
import {
  buildEggFilterOptions,
  EGG_FILTER_ADVENTURE_SYNC,
  EGG_FILTER_ALL,
  filterEggs,
  resolveEggFilter,
} from './eggFilters';

function egg(id: string, eggType: string, isAdventureSync = false): EggHatch {
  return {
    id,
    name: id,
    displayName: id,
    eggType,
    isAdventureSync,
    isRegional: false,
    isGiftExchange: false,
    canBeShiny: false,
    rarity: null,
    image: null,
    combatPower: null,
  };
}

describe('タマゴ絞り込み', () => {
  const eggs = [
    egg('mystery', 'Mystery Egg'),
    egg('regular-ten', '10 km'),
    egg('regular-two', '2 km'),
    egg('adventure-five', '5 km', true),
    egg('regular-one', '1 km'),
  ];

  it('現在の通常タマゴ距離を数値順に並べ、未知値とAdventure Syncを表示する', () => {
    expect(buildEggFilterOptions(eggs)).toEqual([
      { value: EGG_FILTER_ALL, label: 'すべて' },
      { value: 'egg:1 km', label: '1 kmタマゴ' },
      { value: 'egg:2 km', label: '2 kmタマゴ' },
      { value: 'egg:5 km', label: '5 kmタマゴ' },
      { value: 'egg:10 km', label: '10 kmタマゴ' },
      { value: 'egg:Mystery Egg', label: 'Mystery Eggタマゴ' },
      { value: EGG_FILTER_ADVENTURE_SYNC, label: 'いつでも冒険モード' },
    ]);
  });

  it('allでは通常とAdventure Syncをすべて返す', () => {
    expect(filterEggs(eggs, EGG_FILTER_ALL).map(({ id }) => id))
      .toEqual(eggs.map(({ id }) => id));
  });

  it('距離では通常タマゴだけを返し、同距離のAdventure Syncを混ぜない', () => {
    const sameDistance = [...eggs, egg('regular-five', '5 km')];
    expect(filterEggs(sameDistance, 'egg:5 km').map(({ id }) => id))
      .toEqual(['regular-five']);
  });

  it('Adventure Syncでは距離に関係なく該当データだけを返す', () => {
    expect(filterEggs(eggs, EGG_FILTER_ADVENTURE_SYNC).map(({ id }) => id))
      .toEqual(['adventure-five']);
  });

  it('選択中の距離が更新後に消えた場合はallへ戻す', () => {
    const options = buildEggFilterOptions([egg('regular-five', '5 km')]);
    expect(resolveEggFilter('egg:2 km', options)).toBe(EGG_FILTER_ALL);
  });
});
