import { beforeAll, describe, expect, it } from 'vitest';
import type { PvpRankResult } from '../types/calculations';
import { getEffectiveLevelCap } from './cp';
import {
  calculateMasterLeagueStats,
  clearPvpRankingCache,
  getPvpRankResult,
  getPvpRankings,
} from './pvp';

const VENUSAUR = { atk: 198, def: 189, hp: 190 };
let greatLeague: PvpRankResult[];
let ultraLeague: PvpRankResult[];
let masterLeague: PvpRankResult[];

beforeAll(() => {
  clearPvpRankingCache();
  greatLeague = getPvpRankings(VENUSAUR, 'great', 50);
  ultraLeague = getPvpRankings(VENUSAUR, 'ultra', 50);
  masterLeague = getPvpRankings(VENUSAUR, 'master', 50);
});

describe('PvP ranking', () => {
  it('ranks all 4096 IV combinations exactly once', () => {
    expect(greatLeague).toHaveLength(4096);
    expect(
      new Set(
        greatLeague.map(
          ({ ivs }) => `${ivs.attack}/${ivs.defense}/${ivs.hp}`,
        ),
      ).size,
    ).toBe(4096);
    expect(greatLeague[0]?.rank).toBe(1);
    expect(greatLeague.at(-1)?.rank).toBe(4096);
  });

  it('never exceeds the Great League CP or selected PL cap', () => {
    expect(greatLeague.every(({ cp }) => cp <= 1500)).toBe(true);
    expect(greatLeague.every(({ level }) => level <= 50)).toBe(true);
  });

  it('never exceeds the Ultra League CP or selected PL cap', () => {
    expect(ultraLeague).toHaveLength(4096);
    expect(ultraLeague.every(({ cp }) => cp <= 2500)).toBe(true);
    expect(ultraLeague.every(({ level }) => level <= 50)).toBe(true);
  });

  it('matches a published Venusaur Great League rank-one result', () => {
    const rankOne = greatLeague[0];
    expect(rankOne?.ivs).toEqual({ attack: 0, defense: 14, hp: 11 });
    expect(rankOne?.level).toBe(21);
    expect(rankOne?.cp).toBe(1498);
  });

  it('returns the cached ranking for subsequent IV changes', () => {
    expect(getPvpRankings(VENUSAUR, 'great', 50)).toBe(greatLeague);
    expect(
      getPvpRankResult(
        VENUSAUR,
        { attack: 0, defense: 14, hp: 11 },
        'great',
        50,
      )?.rank,
    ).toBe(1);
  });

  it('ranks all 4096 Master League combinations at the same maximum level', () => {
    expect(masterLeague).toHaveLength(4096);
    expect(
      new Set(
        masterLeague.map(
          ({ ivs }) => `${ivs.attack}/${ivs.defense}/${ivs.hp}`,
        ),
      ).size,
    ).toBe(4096);
    expect(masterLeague.every(({ level }) => level === 50)).toBe(true);
    expect(masterLeague[0]?.rank).toBe(1);
    expect(masterLeague.at(-1)?.rank).toBe(4096);
  });

  it('ranks 15/15/15 first in Master League', () => {
    const perfect = getPvpRankResult(
      VENUSAUR,
      { attack: 15, defense: 15, hp: 15 },
      'master',
      50,
    );

    expect(perfect?.rank).toBe(1);
    expect(perfect).toBe(masterLeague[0]);
  });

  it.each([
    [40, false, 40],
    [40, true, 41],
    [50, false, 50],
    [50, true, 51],
  ] as const)(
    'uses PL%s with buddy boost %s as the Master League ranking level',
    (standardCap, buddyBoost, expectedLevel) => {
      const effectiveCap = getEffectiveLevelCap(standardCap, buddyBoost);
      const ranking = getPvpRankings(VENUSAUR, 'master', effectiveCap);

      expect(effectiveCap).toBe(expectedLevel);
      expect(ranking).toHaveLength(4096);
      expect(ranking.every(({ level }) => level === expectedLevel)).toBe(true);
      expect(ranking[0]?.ivs).toEqual({ attack: 15, defense: 15, hp: 15 });
    },
  );

  it('returns the same cached Master League ranking reference', () => {
    expect(getPvpRankings(VENUSAUR, 'master', 50)).toBe(masterLeague);
  });

  it('uses the requested maximum level for Master League output', () => {
    const ivs = { attack: 15, defense: 15, hp: 15 };
    const withoutBuddy = calculateMasterLeagueStats(
      VENUSAUR,
      ivs,
      getEffectiveLevelCap(50, false),
    );
    const withBuddy = calculateMasterLeagueStats(
      VENUSAUR,
      ivs,
      getEffectiveLevelCap(50, true),
    );

    expect(withoutBuddy.level).toBe(50);
    expect(withBuddy.level).toBe(51);
    expect(withBuddy.cp).toBeGreaterThan(withoutBuddy.cp);
    expect(withBuddy.ivPercentage).toBe(100);
    expect(withBuddy.isPerfect).toBe(true);
  });
});
