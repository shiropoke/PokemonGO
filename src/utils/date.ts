import type {
  EventCategory,
  EventGroups,
  EventTimingStatus,
  ScrapedDuckEvent,
} from "../types/events";

const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

const RAID_EVENT_TYPES = new Set([
  "raid-hour",
  "raid-day",
  "raid-battles",
  "raid-weekend",
  "elite-raids",
]);
const RESEARCH_EVENT_TYPES = new Set([
  "research",
  "timed-research",
  "limited-research",
  "special-research",
  "research-day",
]);
const ROCKET_EVENT_TYPES = new Set([
  "go-rocket-takeover",
  "team-go-rocket",
  "giovanni-special-research",
]);

export function parseEventDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();
  if (!input) {
    return null;
  }

  if (EXPLICIT_TIME_ZONE_PATTERN.test(input)) {
    const absoluteDate = new Date(input);
    return Number.isNaN(absoluteDate.getTime()) ? null : absoluteDate;
  }

  const match = LOCAL_DATE_TIME_PATTERN.exec(input);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours = "0", minutes = "0", seconds = "0", ms = "0"] =
    match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHours = Number(hours);
  const numericMinutes = Number(minutes);
  const numericSeconds = Number(seconds);
  const milliseconds = Number(ms.padEnd(3, "0"));

  const daysInMonth = new Date(numericYear, numericMonth, 0).getDate();
  if (
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > daysInMonth ||
    numericHours < 0 ||
    numericHours > 23 ||
    numericMinutes < 0 ||
    numericMinutes > 59 ||
    numericSeconds < 0 ||
    numericSeconds > 59
  ) {
    return null;
  }

  const localDate = new Date(
    numericYear,
    numericMonth - 1,
    numericDay,
    numericHours,
    numericMinutes,
    numericSeconds,
    milliseconds,
  );

  return Number.isNaN(localDate.getTime()) ? null : localDate;
}

export function formatEventDate(
  value: string | Date | null | undefined,
  referenceTime = new Date(),
): string {
  const date = value instanceof Date ? value : parseEventDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return "未定";
  }

  const includeYear = date.getFullYear() !== referenceTime.getFullYear();
  const datePart = includeYear
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getMonth() + 1}月${date.getDate()}日`;
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

  return `${datePart} ${timePart}`;
}

export function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function getEventTimingStatus(
  event: ScrapedDuckEvent,
  now = Date.now(),
): EventTimingStatus {
  const start = parseEventDate(event.start)?.getTime();
  const end = parseEventDate(event.end)?.getTime();

  if (end !== undefined && end <= now) {
    return "ended";
  }

  if (start !== undefined && now < start) {
    return "upcoming";
  }

  if (start !== undefined && end !== undefined && start <= now && now < end) {
    return "ongoing";
  }

  return "unknown";
}

function timeValue(value: string | null, fallback: number): number {
  return parseEventDate(value)?.getTime() ?? fallback;
}

export function groupAndSortEvents(
  events: readonly ScrapedDuckEvent[],
  now = Date.now(),
): EventGroups {
  const groups: EventGroups = {
    ongoing: [],
    upcoming: [],
    ended: [],
    unknown: [],
  };

  for (const event of events) {
    groups[getEventTimingStatus(event, now)].push(event);
  }

  groups.ongoing.sort(
    (left, right) =>
      timeValue(left.end, Number.POSITIVE_INFINITY) -
      timeValue(right.end, Number.POSITIVE_INFINITY),
  );
  groups.upcoming.sort(
    (left, right) =>
      timeValue(left.start, Number.POSITIVE_INFINITY) -
      timeValue(right.start, Number.POSITIVE_INFINITY),
  );
  groups.ended.sort(
    (left, right) =>
      timeValue(right.end, Number.NEGATIVE_INFINITY) -
      timeValue(left.end, Number.NEGATIVE_INFINITY),
  );
  groups.unknown.sort((left, right) => left.name.localeCompare(right.name, "ja"));

  return groups;
}

export function formatCountdown(
  targetTime: number,
  now: number,
  prefix: string,
): string {
  const remainingMs = targetTime - now;
  if (remainingMs <= 0) {
    return `${prefix} 0分`;
  }

  let remainingMinutes = Math.ceil(remainingMs / 60_000);
  const days = Math.floor(remainingMinutes / (24 * 60));
  remainingMinutes -= days * 24 * 60;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes - hours * 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}日`);
  }
  if (hours > 0) {
    parts.push(`${hours}時間`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}分`);
  }

  return `${prefix} ${parts.join(" ")}`;
}

export function getEventCountdown(
  event: ScrapedDuckEvent,
  status: EventTimingStatus,
  now = Date.now(),
): string {
  if (status === "ongoing") {
    const end = parseEventDate(event.end)?.getTime();
    return end === undefined
      ? "終了時刻は未定です"
      : formatCountdown(end, now, "終了まで");
  }

  if (status === "upcoming") {
    const start = parseEventDate(event.start)?.getTime();
    return start === undefined
      ? "開始時刻は未定です"
      : formatCountdown(start, now, "開始まで");
  }

  return status === "ended" ? "終了しました" : "開催日時は未定です";
}

export function getEventCategory(eventType: string | null | undefined): EventCategory {
  const normalized = eventType?.trim().toLowerCase() ?? "";

  if (normalized === "community-day") {
    return "community-day";
  }
  if (normalized === "pokemon-spotlight-hour") {
    return "spotlight-hour";
  }
  if (RAID_EVENT_TYPES.has(normalized)) {
    return "raid";
  }
  if (RESEARCH_EVENT_TYPES.has(normalized)) {
    return "research";
  }
  if (normalized === "go-battle-league") {
    return "battle-league";
  }
  if (ROCKET_EVENT_TYPES.has(normalized)) {
    return "rocket";
  }

  return "other";
}
