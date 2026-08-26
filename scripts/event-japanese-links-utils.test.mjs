import { describe, expect, it } from 'vitest';
import {
  extractOfficialArticle,
  extractOfficialNewsListing,
  matchEventsToOfficialArticles,
  normalizeEventMatchText,
} from './event-japanese-links-utils.mjs';

const listingFixture = `
  <main>
    <article><a href="/news/water-festival-2026">Ultra Unlock: Water Festival</a></article>
    <article><a href="/news/other-news">Other News</a></article>
  </main>
`;

const articleFixture = `
  <main>
    <script type="application/ld+json">{
      "@type":"NewsArticle",
      "headline":"Ultra Unlock: Water Festival",
      "datePublished":"2026-07-01T00:00:00.000Z"
    }</script>
    <h1>Ultra Unlock: Water Festival</h1>
    <h2>Ultra Unlock: Water Festival</h2>
    <p>From July 15, 2026 until July 20, 2026.</p>
  </main>
`;

const event = {
  eventID: 'water-festival-2026',
  name: 'Ultra Unlock: Water Festival',
  eventType: 'event',
  heading: 'Event',
  start: '2026-07-15T10:00:00.000',
  end: '2026-07-20T20:00:00.000',
};

function article(slug = 'water-festival-2026') {
  return {
    slug,
    titleEnglish: 'Ultra Unlock: Water Festival',
    titleJapanese: 'ウルトラアンロック：ウォーターフェスティバル',
    urlEnglish: `https://pokemongo.com/news/${slug}`,
    urlJapanese: `https://pokemongo.com/ja/news/${slug}`,
    ...extractOfficialArticle(articleFixture),
  };
}

describe('official event news parser', () => {
  it('公式一覧からslug・title・URLを抽出する', () => {
    expect(extractOfficialNewsListing(listingFixture, 'en')).toEqual([
      {
        slug: 'water-festival-2026',
        title: 'Ultra Unlock: Water Festival',
        url: 'https://pokemongo.com/news/water-festival-2026',
      },
      {
        slug: 'other-news',
        title: 'Other News',
        url: 'https://pokemongo.com/news/other-news',
      },
    ]);
  });

  it('Unicode・空白・記号を照合用に正規化する', () => {
    expect(normalizeEventMatchText('Pokémon  GO：Water\nFestival')).toBe(
      'pokemon go water festival',
    );
  });
});

describe('safe event matching', () => {
  it('明確に一致するイベントへ日本語公式記事を割り当てる', () => {
    const result = matchEventsToOfficialArticles([event], [article()]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].officialJapaneseUrl).toContain('/ja/news/');
  });

  it('公式記事がなければ対応表へ追加しない', () => {
    expect(matchEventsToOfficialArticles([event], []).matches).toEqual([]);
  });

  it('同名の定期イベントでも開催日が一致しなければ割り当てない', () => {
    const differentDate = {
      ...event,
      start: '2026-08-15T10:00:00.000',
      end: '2026-08-20T20:00:00.000',
    };
    expect(
      matchEventsToOfficialArticles([differentDate], [article()]).matches,
    ).toEqual([]);
  });

  it('イベント名と日付が別の文脈に離れている記事は割り当てない', () => {
    const separatedArticle = {
      ...article(),
      searchText: `ultra unlock water festival ${'unrelated '.repeat(30)} july 15 2026`,
    };
    expect(
      matchEventsToOfficialArticles([event], [separatedArticle]).matches,
    ).toEqual([]);
  });

  it('同点の曖昧な記事が複数ある場合は無理に割り当てない', () => {
    const result = matchEventsToOfficialArticles(
      [event],
      [article('first'), article('second')],
    );
    expect(result.matches).toEqual([]);
    expect(result.ambiguousEventIDs).toEqual([event.eventID]);
  });
});
