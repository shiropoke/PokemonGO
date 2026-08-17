import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PVPoke_BASE =
  'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall';
const LEAGUES = {
  great: 1500,
  ultra: 2500,
  master: 10000,
};
const OUTPUT_PATH = resolve('public/data/pvp-rankings.json');

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function compactEntry(value) {
  if (!isRecord(value)) return null;

  const speciesId =
    typeof value.speciesId === 'string' ? value.speciesId.trim() : '';
  const speciesName =
    typeof value.speciesName === 'string' ? value.speciesName.trim() : '';
  const score = finiteNumber(value.score);
  if (!speciesId || !speciesName || score === null) return null;

  const moveset = Array.isArray(value.moveset)
    ? value.moveset.filter(
        (move) => typeof move === 'string' && move.trim().length > 0,
      )
    : [];
  const stats = isRecord(value.stats)
    ? {
        product: finiteNumber(value.stats.product),
        atk: finiteNumber(value.stats.atk),
        def: finiteNumber(value.stats.def),
        hp: finiteNumber(value.stats.hp),
      }
    : undefined;

  return {
    speciesId,
    speciesName,
    score,
    moveset,
    ...(stats ? { stats } : {}),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Pokemon-GO-Information-data-generator',
    },
  });
  if (!response.ok) {
    throw new Error(`PvPoke request failed (${response.status}): ${url}`);
  }
  return response.json();
}

async function main() {
  const leagueEntries = await Promise.all(
    Object.entries(LEAGUES).map(async ([league, cp]) => {
      const sourceUrl = `${PVPoke_BASE}/rankings-${cp}.json`;
      const source = await fetchJson(sourceUrl);
      if (!Array.isArray(source)) {
        throw new TypeError(`PvPoke ranking is not an array: ${sourceUrl}`);
      }

      const rankings = source.map(compactEntry).filter(Boolean);
      if (rankings.length === 0) {
        throw new Error(`PvPoke ranking contained no usable entries: ${sourceUrl}`);
      }

      return [league, { cp, sourceUrl, rankings }];
    }),
  );

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'PvPoke overall open-league rankings',
    license: 'MIT',
    leagues: Object.fromEntries(leagueEntries),
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8');
  console.log(
    `Wrote ${OUTPUT_PATH}: ${leagueEntries
      .map(([league, value]) => `${league}=${value.rankings.length}`)
      .join(', ')}`,
  );
}

await main();
