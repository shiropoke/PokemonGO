import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const generated = JSON.parse(readFileSync(
  new URL('../public/data/pokefuta.json', import.meta.url),
  'utf8',
));

describe('generated Poké Lid dataset', () => {
  it('47都道府県と全件一致する件数summaryを持つ', () => {
    expect(generated.prefectures).toHaveLength(47);
    expect(generated.prefectures.reduce((sum, prefecture) => sum + prefecture.count, 0))
      .toBe(generated.lids.length);
    expect(generated.summary.total).toBe(generated.lids.length);
  });

  it('baselineの未設置5県も0件の選択肢として保持する', () => {
    const counts = new Map(generated.prefectures.map(({ name, count }) => [name, count]));
    for (const name of ['群馬県', '山梨県', '広島県', '熊本県', '大分県']) {
      expect(counts.get(name)).toBe(0);
    }
  });

  it('公式detail URLと安全なmap URLだけを保持する', () => {
    expect(generated.lids.every(({ officialUrl }) =>
      /^https:\/\/local\.pokemon\.jp\/manhole\/desc\/\d+\/$/.test(officialUrl))).toBe(true);
    expect(generated.lids.every(({ mapUrl }) =>
      mapUrl === null || /^https?:\/\//.test(mapUrl))).toBe(true);
  });
});

