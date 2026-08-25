import { describe, expect, it } from 'vitest';
import type { FieldResearchTask } from '../types/scrapedDuck';
import {
  buildResearchFilterOptions,
  filterResearchTasks,
  RESEARCH_FILTER_ALL,
  RESEARCH_FILTER_OTHER,
} from './researchFilters';

function task(id: string, type: string | null): FieldResearchTask {
  return { id, text: id, displayText: id, type, rewards: [] };
}

describe('フィールドリサーチ絞り込み', () => {
  const tasks = [
    task('unknown', 'route'),
    task('throw', 'throw'),
    task('other-null', null),
    task('event', 'event'),
    task('battle', 'battle'),
    task('catch', 'catch'),
    task('other-empty', ''),
  ];

  it('存在するtypeだけを既定順で表示し、未知typeとその他にも対応する', () => {
    const options = buildResearchFilterOptions(tasks);
    expect(options).toEqual([
      { value: RESEARCH_FILTER_ALL, label: 'すべて' },
      { value: 'type:event', label: 'イベント限定' },
      { value: 'type:catch', label: '捕獲' },
      { value: 'type:throw', label: 'スロー' },
      { value: 'type:battle', label: 'バトル' },
      { value: 'type:route', label: 'route' },
      { value: RESEARCH_FILTER_OTHER, label: 'その他' },
    ]);
    expect(options.some((option) => option.label === 'ポケモン')).toBe(false);
    expect(options.some((option) => option.label === '探索')).toBe(false);
  });

  it('allでは全件を返す', () => {
    expect(filterResearchTasks(tasks, RESEARCH_FILTER_ALL).map(({ id }) => id))
      .toEqual(tasks.map(({ id }) => id));
  });

  it.each(['catch', 'throw', 'battle', 'event'])(
    '%sでは一致するtask.typeだけを返す',
    (type) => {
      expect(filterResearchTasks(tasks, `type:${type}`).map(({ id }) => id))
        .toEqual([type]);
    },
  );

  it('otherではtypeなしだけを返す', () => {
    expect(filterResearchTasks(tasks, RESEARCH_FILTER_OTHER).map(({ id }) => id))
      .toEqual(['other-null', 'other-empty']);
  });
});
