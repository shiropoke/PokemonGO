export interface ScrapedDuckEvent {
  eventID: string;
  name: string;
  eventType: string;
  heading: string | null;
  link: string | null;
  image: string | null;
  start: string | null;
  end: string | null;
  extraData: unknown | null;
}

export type EventTimingStatus =
  | "ongoing"
  | "upcoming"
  | "ended"
  | "unknown";

export type EventCategory =
  | "all"
  | "community-day"
  | "spotlight-hour"
  | "raid"
  | "research"
  | "battle-league"
  | "rocket"
  | "other";

export interface EventGroups {
  ongoing: ScrapedDuckEvent[];
  upcoming: ScrapedDuckEvent[];
  ended: ScrapedDuckEvent[];
  unknown: ScrapedDuckEvent[];
}

export interface EventsFetchResult {
  events: ScrapedDuckEvent[];
  fetchedAt: number;
  source: "network" | "cache";
  stale: boolean;
}
