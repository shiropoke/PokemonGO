import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  extractOfficialArticle,
  extractOfficialNewsListing,
  matchEventsToOfficialArticles,
} from './event-japanese-links-utils.mjs';

const OFFICIAL_ENGLISH_NEWS_URL = 'https://pokemongo.com/news';
const OFFICIAL_JAPANESE_NEWS_URL = 'https://pokemongo.com/ja/news';
const SCRAPED_DUCK_EVENTS_URL = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';
const OUTPUT_PATH = resolve('public/data/event-japanese-links.json');
const MIN_OFFICIAL_ARTICLES = 15;
const MIN_EVENTS = 10;
const CONCURRENCY = 5;

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'GO-Scope-event-link-generator',
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

function isOfficialJapaneseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'pokemongo.com'
      && url.pathname.startsWith('/ja/news/');
  } catch {
    return false;
  }
}

function validateOutput(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.entries)) {
    throw new Error('Invalid event Japanese links schema.');
  }
  if (value.entries.length < 1) {
    throw new Error('No high-confidence Japanese event links were generated.');
  }
  if (value.entries.some((entry) =>
    !entry
    || entry.confidence !== 'high'
    || !isOfficialJapaneseUrl(entry.officialJapaneseUrl))) {
    throw new Error('Invalid Japanese official URL detected.');
  }
  if (
    !value.summary
    || value.summary.matchedEvents !== value.entries.length
    || value.summary.totalEvents !== value.summary.matchedEvents + value.summary.fallbackEvents
  ) {
    throw new Error('Invalid event Japanese links summary.');
  }
  return value;
}

async function readFallback() {
  try {
    return validateOutput(JSON.parse(await readFile(OUTPUT_PATH, 'utf8')));
  } catch {
    return null;
  }
}

async function generate() {
  const [englishListHtml, japaneseListHtml, eventsText] = await Promise.all([
    fetchText(OFFICIAL_ENGLISH_NEWS_URL, 'text/html,application/xhtml+xml'),
    fetchText(OFFICIAL_JAPANESE_NEWS_URL, 'text/html,application/xhtml+xml'),
    fetchText(SCRAPED_DUCK_EVENTS_URL, 'application/json'),
  ]);
  const events = JSON.parse(eventsText);
  if (!Array.isArray(events) || events.length < MIN_EVENTS) {
    throw new Error(`Only ${Array.isArray(events) ? events.length : 0} ScrapedDuck events were found.`);
  }

  const englishListing = extractOfficialNewsListing(englishListHtml, 'en');
  const japaneseListing = extractOfficialNewsListing(japaneseListHtml, 'ja');
  const japaneseBySlug = new Map(japaneseListing.map((article) => [article.slug, article]));
  const paired = englishListing.filter((article) => japaneseBySlug.has(article.slug));
  if (paired.length < MIN_OFFICIAL_ARTICLES) {
    throw new Error(`Only ${paired.length} paired official Japanese news articles were found.`);
  }

  const articles = await mapWithConcurrency(
    paired,
    CONCURRENCY,
    async (englishArticle) => {
      const japaneseArticle = japaneseBySlug.get(englishArticle.slug);
      const html = await fetchText(
        englishArticle.url,
        'text/html,application/xhtml+xml',
      );
      return {
        slug: englishArticle.slug,
        titleEnglish: englishArticle.title,
        titleJapanese: japaneseArticle.title,
        urlEnglish: englishArticle.url,
        urlJapanese: japaneseArticle.url,
        ...extractOfficialArticle(html, englishArticle.title),
      };
    },
  );

  const { matches, ambiguousEventIDs } = matchEventsToOfficialArticles(
    events,
    articles,
  );
  const previous = await readFallback();
  if (
    previous
    && matches.length < Math.max(1, Math.floor(previous.entries.length * 0.5))
  ) {
    throw new Error(
      `Japanese event link count fell from ${previous.entries.length} to ${matches.length}.`,
    );
  }

  const output = validateOutput({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      events: SCRAPED_DUCK_EVENTS_URL,
      officialEnglishNews: OFFICIAL_ENGLISH_NEWS_URL,
      officialJapaneseNews: OFFICIAL_JAPANESE_NEWS_URL,
    },
    summary: {
      totalEvents: events.length,
      matchedEvents: matches.length,
      fallbackEvents: events.length - matches.length,
      pairedOfficialArticles: paired.length,
      ambiguousEvents: ambiguousEventIDs.length,
    },
    entries: matches,
  });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log([
    'Event Japanese links:',
    `- official articles: ${paired.length}`,
    `- Japanese official: ${matches.length}`,
    `- Leek Duck fallback: ${events.length - matches.length}`,
    `- ambiguous skipped: ${ambiguousEventIDs.length}`,
  ].join('\n'));
}

try {
  await generate();
} catch (error) {
  const fallback = await readFallback();
  if (!fallback) throw error;
  console.warn([
    'Event Japanese link refresh failed; keeping fallback JSON.',
    `- Japanese official: ${fallback.summary.matchedEvents}`,
    `- Leek Duck fallback: ${fallback.summary.fallbackEvents}`,
    `- reason: ${error instanceof Error ? error.message : String(error)}`,
  ].join('\n'));
}
