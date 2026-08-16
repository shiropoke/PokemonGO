import { describe, expect, it } from 'vitest';
import { getIvSegmentState } from './IvSelector';

describe('IVセグメントの配色状態', () => {
  it('15なら選択済みの全セルをperfectにする', () => {
    expect(
      Array.from({ length: 16 }, (_, value) => getIvSegmentState(15, value)),
    ).toEqual(Array.from({ length: 16 }, () => 'perfect'));
  });

  it('0〜14なら選択範囲をnormal、右側をinactiveにする', () => {
    expect(getIvSegmentState(14, 0)).toBe('normal');
    expect(getIvSegmentState(14, 14)).toBe('normal');
    expect(getIvSegmentState(14, 15)).toBe('inactive');
  });

  it('0でも0セルだけをnormalにする', () => {
    expect(getIvSegmentState(0, 0)).toBe('normal');
    expect(getIvSegmentState(0, 1)).toBe('inactive');
  });
});
