import * as cheerio from 'cheerio';

export const POKEFUTA_ORIGIN = 'https://local.pokemon.jp';
export const POKEFUTA_SOURCE_URL = `${POKEFUTA_ORIGIN}/manhole/`;

export function normalizePlainText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toAbsoluteHttpUrl(value, baseUrl = POKEFUTA_SOURCE_URL) {
  const normalized = normalizePlainText(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized, baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function isOfficialPokefutaDetailUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'local.pokemon.jp'
      && /^\/manhole\/desc\/\d+\/$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function extractPrefectureLinks(html, prefectures) {
  const $ = cheerio.load(html);
  const bySlug = new Map(prefectures.map((prefecture) => [prefecture.slug, prefecture]));
  const found = new Map();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    const match = href.match(/^\/manhole\/([a-z0-9-]+)\.html(?:[?#].*)?$/i);
    if (!match) return;
    const prefecture = bySlug.get(match[1].toLowerCase());
    if (!prefecture) return;
    found.set(prefecture.slug, {
      ...prefecture,
      pageUrl: new URL(`/manhole/${prefecture.slug}.html`, POKEFUTA_ORIGIN).href,
    });
  });

  return [...found.values()].sort((a, b) => a.order - b.order);
}

export function extractDetailIds(html, prefecture) {
  const $ = cheerio.load(html);
  const ids = new Set();
  $('a[href*="/manhole/desc/"]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    const match = href.match(/\/manhole\/desc\/(\d+)\//);
    if (match) ids.add(match[1]);
  });
  return [...ids].map((id) => ({
    id,
    prefecture,
    officialUrl: `${POKEFUTA_ORIGIN}/manhole/desc/${id}/`,
  }));
}

export function extractCoordinates(mapUrl) {
  if (!mapUrl) return { latitude: null, longitude: null };
  try {
    const url = new URL(mapUrl);
    const candidates = [url.searchParams.get('q'), url.searchParams.get('ll')];
    const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) candidates.push(`${atMatch[1]},${atMatch[2]}`);
    for (const candidate of candidates) {
      const match = candidate?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!match) continue;
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        return { latitude, longitude };
      }
    }
  } catch {
    // Invalid external map URLs are ignored.
  }
  return { latitude: null, longitude: null };
}

export function parsePokefutaDetail(html, descriptor) {
  const $ = cheerio.load(html);
  const heading = normalizePlainText($('.detail-manhole .heading h1').first().text());
  const headingParts = heading.split('/').map(normalizePlainText).filter(Boolean);
  const municipality = headingParts.at(-1) ?? '';
  const pokemonNames = [...new Set(
    $('.detail-manhole .zukan li a').map((_, element) =>
      normalizePlainText($(element).find('span').first().text())).get().filter(Boolean),
  )];
  const mapBlock = $('.detail-manhole .block.map').first();
  const address = normalizePlainText(mapBlock.find('p').first().text());
  const mapUrl = toAbsoluteHttpUrl(
    mapBlock.find('.googlemap-link a[href]').first().attr('href')
      ?? mapBlock.find('iframe[src]').first().attr('src'),
    descriptor.officialUrl,
  );
  const imageUrl = toAbsoluteHttpUrl(
    $('meta[property="og:image"]').attr('content')
      ?? $('.detail-manhole .heading img').first().attr('src'),
    descriptor.officialUrl,
  );
  const canonical = toAbsoluteHttpUrl($('link[rel="canonical"]').attr('href'), descriptor.officialUrl);
  const officialUrl = canonical && isOfficialPokefutaDetailUrl(canonical)
    ? canonical
    : descriptor.officialUrl;
  const coordinates = extractCoordinates(mapUrl);

  return {
    id: String(descriptor.id),
    prefecture: descriptor.prefecture.name,
    prefectureCode: descriptor.prefecture.code,
    prefectureSlug: descriptor.prefecture.slug,
    region: descriptor.prefecture.region,
    municipality,
    locationName: municipality,
    pokemonNames,
    address,
    imageUrl,
    officialUrl,
    mapUrl,
    ...coordinates,
  };
}

