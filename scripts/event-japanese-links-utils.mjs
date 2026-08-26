import { load } from 'cheerio';

const OFFICIAL_ORIGIN = 'https://pokemongo.com';
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export function normalizeWhitespace(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEventMatchText(value) {
  return normalizeWhitespace(value)
    .toLocaleLowerCase('en-US')
    .replace(/pokémon/g, 'pokemon')
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function newsPathPattern(locale) {
  return locale === 'ja' ? /^\/ja\/news\/([^/?#]+)\/?$/ : /^\/news\/([^/?#]+)\/?$/;
}

export function extractOfficialNewsListing(html, locale) {
  if (locale !== 'en' && locale !== 'ja') {
    throw new Error(`Unsupported news locale: ${locale}`);
  }
  const dom = load(html);
  const bySlug = new Map();
  dom('a[href]').each((_, element) => {
    const href = dom(element).attr('href');
    if (!href) return;
    let url;
    try {
      url = new URL(href, OFFICIAL_ORIGIN);
    } catch {
      return;
    }
    if (url.protocol !== 'https:' || url.hostname !== 'pokemongo.com') return;
    const match = newsPathPattern(locale).exec(url.pathname);
    if (!match) return;
    const slug = match[1];
    const title = normalizeWhitespace(dom(element).text());
    if (!slug || !title) return;
    const existing = bySlug.get(slug);
    if (!existing || title.length > existing.title.length) {
      bySlug.set(slug, {
        slug,
        title,
        url: `${OFFICIAL_ORIGIN}${locale === 'ja' ? '/ja' : ''}/news/${slug}`,
      });
    }
  });
  return [...bySlug.values()];
}

function readNewsArticleMetadata(dom) {
  for (const element of dom('script[type="application/ld+json"]').toArray()) {
    try {
      const value = JSON.parse(dom(element).text());
      const candidates = Array.isArray(value) ? value : [value];
      const article = candidates.find((candidate) =>
        candidate && typeof candidate === 'object'
        && (candidate['@type'] === 'NewsArticle' || candidate['@type'] === 'Article'));
      if (article) {
        return {
          headline: normalizeWhitespace(article.headline),
          publishedAt: typeof article.datePublished === 'string'
            ? article.datePublished
            : null,
        };
      }
    } catch {
      // Ignore malformed metadata and use visible plain text below.
    }
  }
  return { headline: '', publishedAt: null };
}

export function extractOfficialArticle(html, fallbackTitle = '') {
  const dom = load(html);
  const metadata = readNewsArticleMetadata(dom);
  const main = dom('main').first().clone();
  main.find('script,style,noscript,svg').remove();
  const headings = main.find('h1,h2,h3')
    .map((_, element) => normalizeWhitespace(dom(element).text()))
    .get()
    .filter(Boolean);
  const bodyText = normalizeWhitespace(main.text());
  const title = metadata.headline || headings[0] || normalizeWhitespace(fallbackTitle);
  return {
    title,
    publishedAt: metadata.publishedAt,
    headings,
    searchText: normalizeEventMatchText([title, ...headings, bodyText].join(' ')),
  };
}

function dateParts(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function findAllIndexes(text, value) {
  const indexes = [];
  let index = text.indexOf(value);
  while (index >= 0) {
    indexes.push(index);
    index = text.indexOf(value, index + value.length);
  }
  return indexes;
}

function articleMentionsEventNameAndDate(articleText, eventName, ...values) {
  const nameIndexes = findAllIndexes(articleText, eventName);
  if (nameIndexes.length === 0) return false;
  for (const value of values) {
    const parts = dateParts(value);
    if (!parts) continue;
    const month = MONTHS[parts.month - 1];
    if (!month) continue;
    const dateIndexes = findAllIndexes(articleText, `${month} ${parts.day}`);
    for (const dateIndex of dateIndexes) {
      const dateContext = articleText.slice(
        Math.max(0, dateIndex - 40),
        dateIndex + 80,
      );
      if (!dateContext.includes(String(parts.year))) continue;
      if (nameIndexes.some((nameIndex) => Math.abs(nameIndex - dateIndex) <= 160)) {
        return true;
      }
    }
  }
  return false;
}

function publicationProximity(publishedAt, start) {
  const published = Date.parse(publishedAt ?? '');
  const begins = Date.parse(start ?? '');
  if (!Number.isFinite(published) || !Number.isFinite(begins)) return 0;
  const days = (begins - published) / 86_400_000;
  return days >= -7 && days <= 180 ? 1 : 0;
}

function scoreCandidate(event, article) {
  const eventName = normalizeEventMatchText(event.name);
  if (eventName.length < 6) return null;
  const title = normalizeEventMatchText(article.titleEnglish);
  const dateMatches = articleMentionsEventNameAndDate(
    article.searchText,
    eventName,
    event.start,
    event.end,
  );
  const eventHasDate = dateParts(event.start) !== null || dateParts(event.end) !== null;
  // Recurring labels such as "Max Battle Day" appear in several articles.
  // A title/name match alone therefore is not enough when the event has dates.
  if (eventHasDate && !dateMatches) return null;
  let score = 0;
  let reason = '';

  if (title === eventName) {
    score = 110;
    reason = 'exact-title';
  } else if (eventName.length >= 10 && title.includes(eventName)) {
    score = 104;
    reason = 'title-contains-event-name';
  } else if (eventName.length >= 10 && article.searchText.includes(eventName) && dateMatches) {
    score = 100;
    reason = 'article-contains-event-name-and-date';
  } else {
    return null;
  }

  const heading = normalizeEventMatchText(event.heading);
  const type = normalizeEventMatchText(event.eventType);
  if (heading.length >= 5 && article.searchText.includes(heading)) score += 1;
  if (type.length >= 5 && article.searchText.includes(type)) score += 1;
  score += publicationProximity(article.publishedAt, event.start);
  return { score, reason };
}

export function matchEventsToOfficialArticles(events, articles) {
  const matches = [];
  const ambiguousEventIDs = [];

  for (const event of events) {
    const candidates = articles
      .map((article) => {
        const scored = scoreCandidate(event, article);
        return scored ? { article, ...scored } : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    const best = candidates[0];
    if (!best) continue;
    if (candidates[1] && candidates[1].score === best.score) {
      ambiguousEventIDs.push(event.eventID);
      continue;
    }
    matches.push({
      eventID: event.eventID,
      eventName: event.name,
      eventType: event.eventType,
      start: typeof event.start === 'string' ? event.start : null,
      end: typeof event.end === 'string' ? event.end : null,
      officialJapaneseUrl: best.article.urlJapanese,
      officialEnglishUrl: best.article.urlEnglish,
      officialTitleJapanese: best.article.titleJapanese,
      officialTitleEnglish: best.article.titleEnglish,
      confidence: 'high',
      matchReason: best.reason,
    });
  }

  return { matches, ambiguousEventIDs };
}
