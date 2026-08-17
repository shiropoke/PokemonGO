import { describe, expect, it } from 'vitest';
import type { RaidCounterAttacker, RaidCounterMove } from './raidCounters';
import { rankRaidCounters } from './raidCounters';

const ghostFast: RaidCounterMove = {
  id: 'SHADOW_CLAW_FAST',
  name: 'シャドークロー',
  type: 'ghost',
  power: 9,
  durationMs: 500,
  energyDelta: 6,
  elite: false,
};
const ghostCharged: RaidCounterMove = {
  id: 'SHADOW_BALL',
  name: 'シャドーボール',
  type: 'ghost',
  power: 100,
  durationMs: 3000,
  energyDelta: -50,
  elite: false,
};
const normalFast: RaidCounterMove = {
  ...ghostFast,
  id: 'TACKLE_FAST',
  name: 'たいあたり',
  type: 'normal',
};
const normalCharged: RaidCounterMove = {
  ...ghostCharged,
  id: 'HYPER_BEAM',
  name: 'はかいこうせん',
  type: 'normal',
};

function attacker(
  speciesId: string,
  atk: number,
  fastMoves = [ghostFast],
  chargedMoves = [ghostCharged],
): RaidCounterAttacker {
  return {
    speciesId,
    displayName: speciesId,
    baseStats: { atk, def: 150, hp: 150 },
    types: ['ghost'],
    tags: [],
    isShadow: false,
    fastMoves,
    chargedMoves,
  };
}

describe('rankRaidCounters', () => {
  it('攻撃種族値・STAB・弱点倍率・技サイクルを使って安定順位を返す', () => {
    const result = rankRaidCounters(
      ['psychic'],
      [attacker('lower', 180), attacker('higher', 240)],
      { level: 40, includeMega: false, includeShadow: false },
    );
    expect(result.map((entry) => entry.speciesId)).toEqual(['higher', 'lower']);
    expect(result[0]?.relativeScore).toBe(100);
    expect(result[0]?.chargedMoveMultiplier).toBe(1.6);
  });

  it('弱点を突けない技だけの候補は対策リストに含めない', () => {
    const result = rankRaidCounters(
      ['psychic'],
      [attacker('neutral', 300, [normalFast], [normalCharged])],
      { level: 40, includeMega: false, includeShadow: false },
    );
    expect(result).toEqual([]);
  });

  it('メガ・シャドウの除外設定を守る', () => {
    const mega = { ...attacker('gengar_mega', 300), tags: ['mega'] };
    const shadow = { ...attacker('gengar_shadow', 300), isShadow: true };
    expect(
      rankRaidCounters(['psychic'], [mega, shadow], {
        level: 50,
        includeMega: false,
        includeShadow: false,
      }),
    ).toEqual([]);
  });
});
