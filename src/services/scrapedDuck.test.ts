import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SCRAPED_DUCK_CACHE_TTL_MS,
  loadRaids,
  normalizeEggs,
  normalizeRaids,
  normalizeResearch,
  normalizeRocketLineups,
} from './scrapedDuck';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const raidPayload = [{
  name: 'Galarian Mr. Mime',
  tier: '3-Star Raids',
  canBeShiny: true,
  types: [{ name: 'ice', image: 'https://example.com/ice.png' }],
  combatPower: {
    normal: { min: 1117, max: 1181 },
    boosted: { min: 1396, max: 1477 },
  },
  boostedWeather: [{ name: 'snow', image: 'https://example.com/snow.png' }],
  image: 'https://example.com/mr-mime.png',
}];

function raidResponse(payload = raidPayload): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ScrapedDuckデータの防御的パース', () => {
  it('レイドの現行配列スキーマを日本語表示へ正規化する', () => {
    const raids = normalizeRaids(raidPayload);
    expect(raids).toHaveLength(1);
    expect(raids?.[0]).toMatchObject({
      displayName: 'バリヤード（ガラルのすがた）',
      speciesId: 'mr_mime_galarian',
      tier: '3-Star Raids',
      isShadow: false,
      types: ['ice'],
    });
  });

  it('現行raids.jsonのShadow接頭辞を明示的な判定値へ正規化する', () => {
    const raids = normalizeRaids([{
      ...raidPayload[0],
      name: 'Shadow Giratina (Altered)',
      tier: '5-Star Raids',
    }]);

    expect(raids?.[0]).toMatchObject({
      name: 'Shadow Giratina (Altered)',
      tier: '5-Star Raids',
      isShadow: true,
      speciesId: 'giratina_altered_shadow',
    });
  });

  it('リサーチ、タマゴ、ロケット団の現行フィールドを保持する', () => {
    const research = normalizeResearch([{
      text: '<span>Catch 3 Bulbasaur</span>',
      type: 'catch',
      rewards: [{
        name: 'Bulbasaur',
        image: 'https://example.com/bulbasaur.png',
        canBeShiny: true,
        combatPower: { min: 442, max: 477 },
      }],
    }]);
    expect(research?.[0]?.displayText).toBe('フシギダネを3匹捕まえる');

    const eggs = normalizeEggs([{
      name: 'Galarian Meowth',
      eggType: '7 km',
      isAdventureSync: false,
      isGiftExchange: true,
      isRegional: false,
      canBeShiny: true,
      rarity: 2,
      image: 'https://example.com/meowth.png',
      combatPower: { min: 568, max: 591 },
    }]);
    expect(eggs?.[0]).toMatchObject({
      displayName: 'ニャース（ガラルのすがた）',
      eggType: '7 km',
      isGiftExchange: true,
    });

    const rocket = normalizeRocketLineups([{
      name: 'Fire-type Female Grunt',
      title: 'Team GO Rocket Grunt',
      type: 'fire',
      firstPokemon: [{
        name: 'Vulpix',
        image: 'https://example.com/vulpix.png',
        types: ['fire'],
        isEncounter: true,
        canBeShiny: false,
      }],
      secondPokemon: [],
      thirdPokemon: [],
    }]);
    expect(rocket?.[0]).toMatchObject({
      displayName: 'ほのおタイプのしたっぱ（女性）',
      titleLabel: 'GOロケット団のしたっぱ',
    });
    expect(rocket?.[0]?.firstPokemon[0]?.displayName).toBe('ロコン');
  });

  it('想定外のルートオブジェクトを有効データとして扱わない', () => {
    expect(normalizeRaids({ raids: raidPayload })).toBeNull();
    expect(normalizeResearch('not-json-array')).toBeNull();
  });
});

describe('ScrapedDuck共通キャッシュ', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T00:00:00.000Z'));
    vi.stubGlobal('window', { localStorage: createStorage() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('5分以内はネットワークへ再アクセスしない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(raidResponse());
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadRaids();
    vi.advanceTimersByTime(SCRAPED_DUCK_CACHE_TTL_MS - 1);
    const second = await loadRaids();

    expect(first.source).toBe('network');
    expect(second.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('期限切れ後の取得失敗時は保存済みデータへフォールバックする', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(raidResponse())
      .mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await loadRaids();
    vi.advanceTimersByTime(SCRAPED_DUCK_CACHE_TTL_MS);
    const stale = await loadRaids();

    expect(stale.source).toBe('cache');
    expect(stale.stale).toBe(true);
    expect(stale.data[0]?.displayName).toBe('バリヤード（ガラルのすがた）');
  });

  it('forceRefreshはfresh cacheを無視してno-storeで新データを保存する', async () => {
    const updatedPayload = [{
      ...raidPayload[0]!,
      name: 'Lunala',
      tier: '5-Star Raids',
    }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(raidResponse())
      .mockResolvedValueOnce(raidResponse(updatedPayload));
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadRaids();
    vi.advanceTimersByTime(1_000);
    const refreshed = await loadRaids({ forceRefresh: true });
    const cached = await loadRaids();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ cache: 'no-store' });
    expect(refreshed.source).toBe('network');
    expect(refreshed.fetchedAt).toBeGreaterThan(first.fetchedAt);
    expect(refreshed.data[0]?.displayName).toBe('ルナアーラ');
    expect(cached.source).toBe('cache');
    expect(cached.data[0]?.displayName).toBe('ルナアーラ');
    expect(cached.fetchedAt).toBe(refreshed.fetchedAt);
  });

  it('forceRefresh失敗時もfresh cacheをstaleとして返す', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(raidResponse())
      .mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadRaids();
    const fallback = await loadRaids({ forceRefresh: true });

    expect(first.source).toBe('network');
    expect(fallback).toMatchObject({
      source: 'cache',
      stale: true,
      fetchedAt: first.fetchedAt,
    });
    expect(fallback.data).toEqual(first.data);
  });
});
