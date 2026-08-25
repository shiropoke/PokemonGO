import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RaidFilters } from './RaidFilters';

describe('RaidFilters', () => {
  it('5種類の横スクロール可能なフィルターと選択状態を表示する', () => {
    const markup = renderToStaticMarkup(
      <RaidFilters selected="mega" onChange={() => undefined} />,
    );

    for (const label of ['すべて', '★5レイド', 'メガレイド', '★3レイド', '★1レイド']) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('aria-label="レイド種類フィルター"');
    expect(markup).toContain('data-horizontal-scroll="true"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('class="filter-chips raid-filters"');
  });
});
