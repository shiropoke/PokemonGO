export const SHADOW_ATTACK_MULTIPLIER = 1.2;

export function applyShadowAttackModifier(value: number): number {
  return value * SHADOW_ATTACK_MULTIPLIER;
}
