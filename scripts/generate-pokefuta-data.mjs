import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { POKEFUTA_PREFECTURES, POKEFUTA_REGIONS } from './pokefuta-prefectures.mjs';
import {
  extractDetailIds,
  extractPrefectureLinks,
  isOfficialPokefutaDetailUrl,
  parsePokefutaDetail,
  POKEFUTA_SOURCE_URL,
} from './pokefuta-utils.mjs';

const OUTPUT_PATH = resolve('public/data/pokefuta.json');
const TEMP_PATH = resolve('public/data/pokefuta.json.tmp');
const CONCURRENCY = 5;
const MIN_DETAIL_COUNT = 450;
const MIN_INSTALLED_PREFECTURES = 40;
const isFullRefresh = process.argv.includes('--full');

async function fetchText(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'GO-Scope-pokefuta-generator/1.0',
      },
    });
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 400 * attempt));
    return fetchText(url, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function readFallback() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    return validateDataset(parsed, { allowOlderGeneratedAt: true });
  } catch {
    return null;
  }
}

async function discoverDetails() {
  const areaPages = await mapConcurrent(POKEFUTA_REGIONS, CONCURRENCY, async (region) => ({
    region,
    html: await fetchText(`${POKEFUTA_SOURCE_URL}area/${region.id}/`),
  }));
  const prefectureLinks = areaPages.flatMap(({ html }) =>
    extractPrefectureLinks(html, POKEFUTA_PREFECTURES));
  const uniquePrefectures = [...new Map(
    prefectureLinks.map((prefecture) => [prefecture.slug, prefecture]),
  ).values()].sort((a, b) => a.order - b.order);
  if (uniquePrefectures.length < MIN_INSTALLED_PREFECTURES || uniquePrefectures.length > 47) {
    throw new Error(`Only ${uniquePrefectures.length} installed prefectures were discovered.`);
  }

  const prefecturePages = await mapConcurrent(uniquePrefectures, CONCURRENCY, async (prefecture) => ({
    prefecture,
    html: await fetchText(prefecture.pageUrl),
  }));
  const descriptors = prefecturePages.flatMap(({ html, prefecture }) =>
    extractDetailIds(html, prefecture));
  const unique = new Map();
  for (const descriptor of descriptors) {
    const previous = unique.get(descriptor.id);
    if (previous && previous.prefecture.slug !== descriptor.prefecture.slug) {
      throw new Error(`Detail ID ${descriptor.id} appeared in multiple prefectures.`);
    }
    unique.set(descriptor.id, descriptor);
  }
  const discovered = [...unique.values()];
  if (discovered.length < MIN_DETAIL_COUNT) {
    throw new Error(`Only ${discovered.length} Poké Lid detail IDs were discovered.`);
  }
  return { installedPrefectures: uniquePrefectures, descriptors: discovered };
}

function createDataset(lids) {
  const counts = new Map();
  for (const lid of lids) counts.set(lid.prefectureSlug, (counts.get(lid.prefectureSlug) ?? 0) + 1);
  const prefectures = POKEFUTA_PREFECTURES.map((prefecture) => ({
    code: prefecture.code,
    name: prefecture.name,
    slug: prefecture.slug,
    region: prefecture.region,
    order: prefecture.order,
    count: counts.get(prefecture.slug) ?? 0,
    installed: (counts.get(prefecture.slug) ?? 0) > 0,
  }));
  const installedPrefectures = prefectures.filter(({ count }) => count > 0).length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: POKEFUTA_SOURCE_URL,
    summary: {
      total: lids.length,
      installedPrefectures,
      uninstalledPrefectures: prefectures.length - installedPrefectures,
    },
    prefectures,
    lids,
  };
}

function validateDataset(value, options = {}) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.prefectures) || !Array.isArray(value.lids)) {
    throw new Error('Invalid Poké Lid dataset schema.');
  }
  if (value.prefectures.length !== 47) throw new Error('Poké Lid dataset must contain 47 prefectures.');
  if (value.lids.length < MIN_DETAIL_COUNT) throw new Error(`Poké Lid dataset has only ${value.lids.length} records.`);
  const ids = new Set(value.lids.map(({ id }) => String(id)));
  if (ids.size !== value.lids.length) throw new Error('Duplicate Poké Lid detail IDs detected.');
  const total = value.prefectures.reduce((sum, prefecture) => sum + prefecture.count, 0);
  if (total !== value.lids.length || value.summary?.total !== value.lids.length) {
    throw new Error('Prefecture counts do not match the Poké Lid total.');
  }
  const installed = value.prefectures.filter(({ count }) => count > 0).length;
  if (installed < MIN_INSTALLED_PREFECTURES || value.summary?.installedPrefectures !== installed) {
    throw new Error('Installed prefecture summary is inconsistent.');
  }
  const missingAddresses = value.lids.filter(({ address }) => !address).length;
  if (missingAddresses / value.lids.length > 0.05) {
    throw new Error(`${missingAddresses} Poké Lid records are missing addresses.`);
  }
  if (value.lids.some(({ officialUrl }) => !isOfficialPokefutaDetailUrl(officialUrl))) {
    throw new Error('Invalid official Poké Lid URL detected.');
  }
  if (!options.allowOlderGeneratedAt && Number.isNaN(Date.parse(value.generatedAt))) {
    throw new Error('Invalid generatedAt value.');
  }
  return value;
}

function logSummary(dataset, mode) {
  console.log(`Poké Lids (${mode}):`);
  console.log(`- total lids: ${dataset.summary.total}`);
  console.log(`- installed prefectures: ${dataset.summary.installedPrefectures}`);
  console.log(`- uninstalled prefectures: ${dataset.summary.uninstalledPrefectures}`);
  for (const prefecture of dataset.prefectures) {
    console.log(`- ${prefecture.name}: ${prefecture.count}`);
  }
}

async function generate() {
  const fallback = await readFallback();
  const { descriptors } = await discoverDetails();
  const discoveredIds = new Set(descriptors.map(({ id }) => id));
  const fallbackById = new Map((fallback?.lids ?? []).map((lid) => [String(lid.id), lid]));
  const removedIds = [...fallbackById.keys()].filter((id) => !discoveredIds.has(id));
  if (removedIds.length > 0) {
    throw new Error(`Official discovery omitted ${removedIds.length} existing IDs; fallback was preserved.`);
  }
  if (fallback && descriptors.length < Math.floor(fallback.lids.length * 0.95)) {
    throw new Error('Discovered detail count dropped too far below the fallback dataset.');
  }

  const toFetch = isFullRefresh
    ? descriptors
    : descriptors.filter(({ id }) => !fallbackById.has(id));
  let completed = 0;
  const fetched = await mapConcurrent(toFetch, CONCURRENCY, async (descriptor) => {
    const html = await fetchText(`${descriptor.officialUrl}?is_modal=1`);
    const lid = parsePokefutaDetail(html, descriptor);
    completed += 1;
    if (completed % 25 === 0 || completed === toFetch.length) {
      console.log(`Fetched Poké Lid details: ${completed}/${toFetch.length}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 80));
    return lid;
  });
  const fetchedById = new Map(fetched.map((lid) => [lid.id, lid]));
  const lids = descriptors.map((descriptor) =>
    fetchedById.get(descriptor.id) ?? fallbackById.get(descriptor.id));
  if (lids.some((lid) => !lid)) throw new Error('One or more Poké Lid details could not be resolved.');
  lids.sort((a, b) =>
    a.prefectureCode - b.prefectureCode
      || a.municipality.localeCompare(b.municipality, 'ja-JP')
      || Number(a.id) - Number(b.id));
  const dataset = validateDataset(createDataset(lids));
  await writeFile(TEMP_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  await rename(TEMP_PATH, OUTPUT_PATH);
  logSummary(dataset, isFullRefresh ? 'full' : 'incremental');
}

try {
  await generate();
} catch (error) {
  const fallback = await readFallback();
  if (!fallback) throw error;
  console.warn(`Poké Lid refresh failed; keeping fallback JSON.\n- total lids: ${fallback.lids.length}\n- reason: ${error instanceof Error ? error.message : String(error)}`);
}
