import { getCpMultiplier } from './cp';
import { getTypeEffectiveness } from './typeEffectiveness';

export interface RaidCounterMove {
  id: string;
  name: string;
  type: string;
  power: number;
  durationMs: number;
  energyDelta: number;
  elite: boolean;
}

export interface RaidCounterAttacker {
  speciesId: string;
  displayName: string;
  baseStats: { atk: number; def: number; hp: number };
  types: string[];
  tags: string[];
  isShadow: boolean;
  fastMoves: RaidCounterMove[];
  chargedMoves: RaidCounterMove[];
}

export interface RaidCounterOptions {
  level: 40 | 50;
  includeMega: boolean;
  includeShadow: boolean;
  limit?: number;
}

export interface RaidCounterResult {
  speciesId: string;
  displayName: string;
  types: string[];
  fastMove: RaidCounterMove;
  chargedMove: RaidCounterMove;
  fastMoveMultiplier: number;
  chargedMoveMultiplier: number;
  effectiveAttack: number;
  cycleDps: number;
  rawAttackScore: number;
  relativeScore: number;
}

function isMegaOrPrimal(attacker: RaidCounterAttacker): boolean {
  return (
    attacker.tags.includes('mega') ||
    attacker.speciesId.includes('_mega') ||
    attacker.speciesId.includes('_primal')
  );
}

function moveDamageFactor(
  move: RaidCounterMove,
  attackerTypes: readonly string[],
  bossTypes: readonly string[],
): { damage: number; multiplier: number } {
  const multiplier = getTypeEffectiveness(move.type, bossTypes);
  const stab = attackerTypes.includes(move.type) ? 1.2 : 1;
  return { damage: move.power * stab * multiplier, multiplier };
}

function scoreMoveset(
  attacker: RaidCounterAttacker,
  fastMove: RaidCounterMove,
  chargedMove: RaidCounterMove,
  bossTypes: readonly string[],
  effectiveAttack: number,
): Omit<RaidCounterResult, 'relativeScore'> | null {
  if (
    fastMove.power <= 0 ||
    fastMove.durationMs <= 0 ||
    fastMove.energyDelta <= 0 ||
    chargedMove.power <= 0 ||
    chargedMove.durationMs <= 0 ||
    chargedMove.energyDelta >= 0
  ) {
    return null;
  }

  const fast = moveDamageFactor(fastMove, attacker.types, bossTypes);
  const charged = moveDamageFactor(chargedMove, attacker.types, bossTypes);
  if (Math.max(fast.multiplier, charged.multiplier) <= 1) return null;

  // 余剰エネルギーは次のサイクルへ持ち越されるため、長時間平均では整数へ
  // 切り上げず「消費 / 獲得」で通常技回数を扱う。
  const fastUses = Math.max(
    1,
    Math.abs(chargedMove.energyDelta) / fastMove.energyDelta,
  );
  const cycleSeconds =
    (fastUses * fastMove.durationMs + chargedMove.durationMs) / 1000;
  if (!Number.isFinite(cycleSeconds) || cycleSeconds <= 0) return null;

  const cycleDamage = fastUses * fast.damage + charged.damage;
  const cycleDps = cycleDamage / cycleSeconds;
  const rawAttackScore = effectiveAttack * cycleDps;
  if (!Number.isFinite(rawAttackScore) || rawAttackScore <= 0) return null;

  return {
    speciesId: attacker.speciesId,
    displayName: attacker.displayName,
    types: [...attacker.types],
    fastMove,
    chargedMove,
    fastMoveMultiplier: fast.multiplier,
    chargedMoveMultiplier: charged.multiplier,
    effectiveAttack,
    cycleDps,
    rawAttackScore,
  };
}

/**
 * レイドの完全な戦闘シミュレーションではなく、技サイクルの攻撃性能を比較します。
 * 攻撃種族値+15、指定PLのCPM、技威力・時間・エネルギー、STAB、GOタイプ倍率を使用。
 * ボス技、回避、天候、フレンド/メガブースト、耐久による退場時間は含みません。
 */
export function rankRaidCounters(
  bossTypes: readonly string[],
  attackers: readonly RaidCounterAttacker[],
  options: RaidCounterOptions,
): RaidCounterResult[] {
  if (bossTypes.length === 0) return [];

  const multiplier = getCpMultiplier(options.level);
  const results: Omit<RaidCounterResult, 'relativeScore'>[] = [];

  for (const attacker of attackers) {
    if (!options.includeShadow && attacker.isShadow) continue;
    if (!options.includeMega && isMegaOrPrimal(attacker)) continue;

    const effectiveAttack =
      (attacker.baseStats.atk + 15) *
      multiplier *
      (attacker.isShadow ? 1.2 : 1);
    let best: Omit<RaidCounterResult, 'relativeScore'> | null = null;

    for (const fastMove of attacker.fastMoves) {
      for (const chargedMove of attacker.chargedMoves) {
        const result = scoreMoveset(
          attacker,
          fastMove,
          chargedMove,
          bossTypes,
          effectiveAttack,
        );
        if (
          result &&
          (!best ||
            result.rawAttackScore > best.rawAttackScore ||
            (result.rawAttackScore === best.rawAttackScore &&
              `${result.fastMove.id}:${result.chargedMove.id}` <
                `${best.fastMove.id}:${best.chargedMove.id}`))
        ) {
          best = result;
        }
      }
    }
    if (best) results.push(best);
  }

  results.sort(
    (left, right) =>
      right.rawAttackScore - left.rawAttackScore ||
      left.speciesId.localeCompare(right.speciesId, 'en'),
  );
  const topScore = results[0]?.rawAttackScore ?? 1;
  return results.slice(0, Math.max(0, options.limit ?? 12)).map((entry) => ({
    ...entry,
    relativeScore: (entry.rawAttackScore / topScore) * 100,
  }));
}
