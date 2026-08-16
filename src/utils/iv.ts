import type {
  IndividualValues,
  IvStarRating,
  IvSummary,
} from '../types/calculations';

export const MIN_IV = 0;
export const MAX_IV = 15;
export const MAX_IV_TOTAL = MAX_IV * 3;

export function isValidIv(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_IV && value <= MAX_IV;
}

export function isValidIndividualValues(
  value: unknown,
): value is IndividualValues {
  if (value === null || typeof value !== 'object') return false;
  const ivs = value as Partial<IndividualValues>;
  return isValidIv(ivs.attack as number) &&
    isValidIv(ivs.defense as number) &&
    isValidIv(ivs.hp as number);
}

function assertValidIndividualValues(ivs: IndividualValues): void {
  if (!isValidIndividualValues(ivs)) {
    throw new RangeError('Individual values must be integers from 0 through 15.');
  }
}

export function calculateIvTotal(ivs: IndividualValues): number {
  assertValidIndividualValues(ivs);
  return ivs.attack + ivs.defense + ivs.hp;
}

export function calculateIvPercentage(ivs: IndividualValues): number {
  return (calculateIvTotal(ivs) / MAX_IV_TOTAL) * 100;
}

/**
 * Appraisal thresholds use the integer IV sum, never rounded percentages:
 * 0–22 = 0★, 23–29 = 1★, 30–36 = 2★, 37–44 = 3★, 45 = 4★.
 */
export function getStarRating(ivTotal: number): IvStarRating {
  if (!Number.isInteger(ivTotal) || ivTotal < 0 || ivTotal > MAX_IV_TOTAL) {
    throw new RangeError('IV total must be an integer from 0 through 45.');
  }

  if (ivTotal === 45) return 4;
  if (ivTotal >= 37) return 3;
  if (ivTotal >= 30) return 2;
  if (ivTotal >= 23) return 1;
  return 0;
}

export function calculateIvSummary(ivs: IndividualValues): IvSummary {
  const total = calculateIvTotal(ivs);
  const stars = getStarRating(total);

  return {
    total,
    percentage: (total / MAX_IV_TOTAL) * 100,
    stars,
    gradeLabel: stars === 4 ? '4★ / PERFECT' : `${stars}★`,
  };
}
