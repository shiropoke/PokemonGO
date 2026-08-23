import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TYPE_META } from '../constants/typeMeta';
import { POKEMON_TYPES } from '../types/gameData';
import { TypeBadge } from './TypeBadge';

describe('TypeBadge', () => {
  it('添付アイコン、日本語名、タイプ色、補足値を一つのタグに表示する', () => {
    const markup = renderToStaticMarkup(
      <TypeBadge type="water" variant="compact">×2.56</TypeBadge>,
    );

    expect(markup).toContain('class="type-badge type-badge--compact"');
    expect(markup).toContain('data-type="water"');
    expect(markup).toContain('--type-color:#43ABF7');
    expect(markup).toContain('<img');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('width="1254"');
    expect(markup).toContain('height="1254"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).toContain('みず');
    expect(markup).toContain('×2.56');
  });

  it('18タイプすべてを共通コンポーネントで日本語表示する', () => {
    const markup = renderToStaticMarkup(
      <>{POKEMON_TYPES.map((type) => <TypeBadge key={type} type={type} />)}</>,
    );

    expect(markup.match(/class="type-badge__icon"/g)).toHaveLength(18);
    for (const type of POKEMON_TYPES) {
      expect(markup).toContain(`data-type="${type}"`);
      expect(markup).toContain(TYPE_META[type].labelJa);
    }
  });

  it('未知タイプでもクラッシュせず、存在しないアイコンを表示しない', () => {
    const markup = renderToStaticMarkup(<TypeBadge type="stellar" />);
    expect(markup).toContain('data-type="stellar"');
    expect(markup).toContain('stellar');
    expect(markup).not.toContain('<img');
  });
});
