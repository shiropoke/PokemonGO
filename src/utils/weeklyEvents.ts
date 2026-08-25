import type { ScrapedDuckEvent } from '../types/events';
import { WEEKLY_EVENT_VIEW_STORAGE_KEY } from '../services/appStorage';
import { parseEventDate } from './date';

export type WeeklyEventView = 'list' | 'calendar';

export { WEEKLY_EVENT_VIEW_STORAGE_KEY };

export interface WeekRange {
  start: Date;
  end: Date;
  days: Date[];
}

export interface WeeklyEventGroup {
  date: Date;
  events: ScrapedDuckEvent[];
}

export interface WeeklyEventCalendarSpan {
  startColumn: number;
  endColumn: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function localDayNumber(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
}

function eventSortTime(event: ScrapedDuckEvent): number {
  return (
    parseEventDate(event.start)?.getTime() ??
    parseEventDate(event.end)?.getTime() ??
    Number.POSITIVE_INFINITY
  );
}

function eventOverlapsRange(event: ScrapedDuckEvent, range: WeekRange): boolean {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);

  if (!start && !end) return false;

  if (start && end && end.getTime() > start.getTime()) {
    return start.getTime() < range.end.getTime() && end.getTime() > range.start.getTime();
  }

  const point = start ?? end;
  return Boolean(
    point &&
      point.getTime() >= range.start.getTime() &&
      point.getTime() < range.end.getTime(),
  );
}

/** 日本語UIの一週間（月曜 00:00 以上、翌月曜 00:00 未満）を返します。 */
export function getJapaneseWeekRange(reference: Date | number = new Date()): WeekRange {
  const date = reference instanceof Date ? reference : new Date(reference);
  const localDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const start = startOfLocalDay(localDate);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end, days };
}

/** 週と重なるイベントを、開始日時（欠損時は終了日時）順で返します。 */
export function getWeeklyEvents(
  events: readonly ScrapedDuckEvent[],
  reference: Date | number = new Date(),
): ScrapedDuckEvent[] {
  const range = getJapaneseWeekRange(reference);
  const seen = new Set<string>();

  return events
    .filter((event) => {
      const identity = event.eventID || `${event.name}:${event.start ?? ''}:${event.end ?? ''}`;
      if (seen.has(identity) || !eventOverlapsRange(event, range)) return false;
      seen.add(identity);
      return true;
    })
    .sort((left, right) => {
      const timeDifference = eventSortTime(left) - eventSortTime(right);
      return timeDifference || left.name.localeCompare(right.name, 'ja');
    });
}

export function groupWeeklyEvents(
  events: readonly ScrapedDuckEvent[],
  reference: Date | number = new Date(),
): WeeklyEventGroup[] {
  const range = getJapaneseWeekRange(reference);
  const groups = new Map<number, ScrapedDuckEvent[]>();

  for (const event of events) {
    const parsedStart = parseEventDate(event.start) ?? parseEventDate(event.end);
    if (!parsedStart) continue;
    const groupDate =
      parsedStart.getTime() < range.start.getTime() ? range.start : startOfLocalDay(parsedStart);
    const key = localDayNumber(groupDate);
    const existing = groups.get(key) ?? [];
    existing.push(event);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([dayNumber, groupedEvents]) => ({
      date: new Date(
        range.start.getFullYear(),
        range.start.getMonth(),
        range.start.getDate() + (dayNumber - localDayNumber(range.start)),
      ),
      events: groupedEvents.sort((left, right) => eventSortTime(left) - eventSortTime(right)),
    }));
}

/** CSS Grid向けの1始まり・終了線排他的な列番号を返します。 */
export function getWeeklyEventCalendarSpan(
  event: ScrapedDuckEvent,
  reference: Date | number = new Date(),
): WeeklyEventCalendarSpan | null {
  const range = getJapaneseWeekRange(reference);
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  if (!start && !end) return null;

  const effectiveStart = start ?? end;
  let effectiveLastDay = end ?? start;
  if (!effectiveStart || !effectiveLastDay) return null;

  // end は排他的な時刻として扱い、翌日0時終了を前日のバーに収めます。
  if (end && start && end.getTime() > start.getTime()) {
    effectiveLastDay = new Date(end.getTime() - 1);
  }

  const startOffset = Math.max(
    0,
    Math.min(6, localDayNumber(effectiveStart) - localDayNumber(range.start)),
  );
  const endOffset = Math.max(
    startOffset,
    Math.min(6, localDayNumber(effectiveLastDay) - localDayNumber(range.start)),
  );

  return { startColumn: startOffset + 1, endColumn: endOffset + 2 };
}

export function readWeeklyEventView(storage?: StorageLike | null): WeeklyEventView {
  try {
    const value = storage?.getItem(WEEKLY_EVENT_VIEW_STORAGE_KEY);
    return value === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

export function saveWeeklyEventView(
  view: WeeklyEventView,
  storage?: StorageLike | null,
): void {
  try {
    storage?.setItem(WEEKLY_EVENT_VIEW_STORAGE_KEY, view);
  } catch {
    // localStorage が無効でも表示切り替え自体は継続します。
  }
}

export function formatWeeklyDayHeading(date: Date): string {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

export function formatWeeklyEventRange(event: ScrapedDuckEvent): string {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end);
  const time = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dateTime = (date: Date) => `${date.getMonth() + 1}/${date.getDate()} ${time(date)}`;

  if (start && end) {
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    return sameDay ? `${time(start)}〜${time(end)}` : `${dateTime(start)}〜${dateTime(end)}`;
  }
  if (start) return `${dateTime(start)}〜終了未定`;
  if (end) return `開始未定〜${dateTime(end)}`;
  return '開催日時未定';
}
