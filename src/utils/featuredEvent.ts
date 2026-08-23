import type { ScrapedDuckEvent } from '../types/events';
import { getEventTimingStatus, parseEventDate } from './date';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const EVENT_TYPE_IMPORTANCE: Readonly<Record<string, number>> = {
  'pokemon-go-fest': 500,
  'community-day': 420,
  'raid-day': 380,
  'research-day': 360,
  'go-rocket-takeover': 350,
  'team-go-rocket': 350,
  'giovanni-special-research': 330,
  event: 240,
  'max-battles': 220,
  research: 190,
  'timed-research': 190,
  'limited-research': 190,
  'special-research': 190,
  'raid-weekend': 180,
  'elite-raids': 180,
  'raid-battles': 160,
  'go-battle-league': 130,
  'pokemon-spotlight-hour': 0,
  'raid-hour': 0,
  'max-mondays': 0,
  season: -180,
  'go-pass': -120,
};

const ROUTINE_EVENT_TYPES = new Set([
  'pokemon-spotlight-hour',
  'raid-hour',
  'max-mondays',
]);

function normalizedEventText(event: ScrapedDuckEvent): string {
  return `${event.heading ?? ''} ${event.name}`.normalize('NFKC').toLowerCase();
}

function getSemanticImportance(event: ScrapedDuckEvent): number {
  const text = normalizedEventText(event);

  if (/pok(?:e|é)mon\s+go\s+(?:fest|tour)/i.test(text)) return 500;
  if (/community\s+day(?:\s+classic)?/i.test(text)) return 420;
  if (/\braid\s+day\b/i.test(text)) return 380;
  if (/\bresearch\s+day\b/i.test(text)) return 360;
  if (/team\s+go\s+rocket|go\s+rocket\s+takeover/i.test(text)) return 350;

  // ScrapedDuckで大型イベントが通常のeventとして配信される場合の補助判定。
  if (/\bglobal\b/i.test(text)) return 400;

  return Number.NEGATIVE_INFINITY;
}

function getImportance(event: ScrapedDuckEvent): number {
  const type = event.eventType.trim().toLowerCase();
  const typeImportance = EVENT_TYPE_IMPORTANCE[type] ?? 100;
  return Math.max(typeImportance, getSemanticImportance(event));
}

function getUpcomingUrgency(start: number, now: number): number {
  const untilStart = start - now;
  if (untilStart <= HOUR_MS) return 700;
  if (untilStart <= 6 * HOUR_MS) return 450;
  if (untilStart <= DAY_MS) return 250;
  if (untilStart <= 3 * DAY_MS) return 120;
  if (untilStart <= 7 * DAY_MS) return 40;

  const daysBeyondWeek = Math.floor((untilStart - 7 * DAY_MS) / DAY_MS) + 1;
  return -Math.min(300, daysBeyondWeek * 20);
}

function getDurationAdjustment(event: ScrapedDuckEvent): number {
  const start = parseEventDate(event.start)?.getTime();
  const end = parseEventDate(event.end)?.getTime();
  if (start === undefined || end === undefined || end <= start) return 0;

  const duration = end - start;
  const type = event.eventType.trim().toLowerCase();
  let adjustment = 0;

  if (duration <= 2 * HOUR_MS && getImportance(event) < 330) adjustment -= 80;
  if (duration > 21 * DAY_MS) adjustment -= 100;
  if (duration > 60 * DAY_MS) adjustment -= 100;
  if (ROUTINE_EVENT_TYPES.has(type)) adjustment -= 350;

  return adjustment;
}

/**
 * ホームの注目イベント向けスコア。終了済み・日時不明は候補外です。
 */
export function scoreFeaturedEvent(
  event: ScrapedDuckEvent,
  now = Date.now(),
): number {
  const status = getEventTimingStatus(event, now);
  if (status !== 'ongoing' && status !== 'upcoming') {
    return Number.NEGATIVE_INFINITY;
  }

  let score = getImportance(event) + getDurationAdjustment(event);
  if (status === 'ongoing') return score + 1000;

  const start = parseEventDate(event.start)?.getTime();
  if (start === undefined) return Number.NEGATIVE_INFINITY;
  return score + 300 + getUpcomingUrgency(start, now);
}

function compareFeaturedEvents(
  left: ScrapedDuckEvent,
  right: ScrapedDuckEvent,
  now: number,
): number {
  const scoreDifference =
    scoreFeaturedEvent(right, now) - scoreFeaturedEvent(left, now);
  if (scoreDifference !== 0) return scoreDifference;

  const leftStatus = getEventTimingStatus(left, now);
  const rightStatus = getEventTimingStatus(right, now);
  if (leftStatus !== rightStatus) return leftStatus === 'ongoing' ? -1 : 1;

  const leftTime = parseEventDate(
    leftStatus === 'ongoing' ? left.end : left.start,
  )?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = parseEventDate(
    rightStatus === 'ongoing' ? right.end : right.start,
  )?.getTime() ?? Number.POSITIVE_INFINITY;

  return leftTime - rightTime || left.eventID.localeCompare(right.eventID, 'en');
}

export function selectFeaturedEvent(
  events: readonly ScrapedDuckEvent[],
  now = Date.now(),
): ScrapedDuckEvent | null {
  const candidates = events.filter((event) =>
    Number.isFinite(scoreFeaturedEvent(event, now)),
  );

  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) =>
    compareFeaturedEvents(left, right, now),
  )[0] ?? null;
}
