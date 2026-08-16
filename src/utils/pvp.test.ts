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

beforeAll(() => {
  clearPvpRankingCache();
  greatLeague = getPvpRankings(VENUSAUR, 'great', 50);
  ultraLeague = getPvpRankings(VENUSAUR, 'ultra', 50);
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
