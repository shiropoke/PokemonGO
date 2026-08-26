import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventCard } from "../components/EventCard";
import { EventFilters } from "../components/EventFilters";
import { EventSkeleton } from "../components/EventSkeleton";
import { RefreshButton } from "../components/RefreshButton";
import { EVENTS_CACHE_TTL_MS, loadEvents } from "../services/events";
import type { DatasetLoadOptions } from '../types/scrapedDuck';
import type {
  EventCategory,
  EventTimingStatus,
  EventsFetchResult,
  ScrapedDuckEvent,
} from "../types/events";
import {
  formatLastUpdated,
  getEventCategory,
  groupAndSortEvents,
} from "../utils/date";
import { getHashQueryParam } from "../types/navigation";

interface EventSectionProps {
  title: string;
  emptyMessage: string;
  events: ScrapedDuckEvent[];
  status: EventTimingStatus;
  now: number;
  highlightedEventId: string | null;
}

function EventSection({
  title,
  emptyMessage,
  events,
  status,
  now,
  highlightedEventId,
}: EventSectionProps) {
  return (
    <section className="events-section" aria-labelledby={`events-${status}-title`}>
      <div className="events-section__header">
        <h2 id={`events-${status}-title`}>{title}</h2>
        <span className="events-section__count" aria-label={`${events.length}件`}>
          {events.length}
        </span>
      </div>
      {events.length > 0 ? (
        <div className="event-list">
          {events.map((event, index) => (
            <div
              className={`search-target-anchor${highlightedEventId === event.eventID ? " is-search-target" : ""}`}
              data-event-id={event.eventID}
              key={`${event.eventID}-${index}`}
            >
              <EventCard event={event} status={status} now={now} />
            </div>
          ))}
        </div>
      ) : (
        <p className="events-section__empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export function EventsPage() {
  const [result, setResult] = useState<EventsFetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<EventCategory>("all");
  const [showEnded, setShowEnded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [targetEventId, setTargetEventId] = useState(() =>
    getHashQueryParam(window.location.hash, "event"),
  );
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const resultRef = useRef<EventsFetchResult | null>(null);
  const requestCountRef = useRef(0);
  const lastRevalidationAttemptRef = useRef(0);

  const requestEvents = useCallback(
    async (options: DatasetLoadOptions = {}) => {
      requestCountRef.current += 1;
      setLoading(true);
      setError(false);

      try {
        const nextResult = await loadEvents(options);
        if (!options.signal?.aborted) {
          resultRef.current = nextResult;
          setResult(nextResult);
          setNow(Date.now());
        }
      } catch {
        if (!options.signal?.aborted) {
          setError(true);
        }
      } finally {
        requestCountRef.current = Math.max(0, requestCountRef.current - 1);
        if (!options.signal?.aborted && requestCountRef.current === 0) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void requestEvents({ signal: controller.signal });
    return () => controller.abort();
  }, [requestEvents]);

  useEffect(() => {
    const updateNowAndRevalidate = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      const current = resultRef.current;
      if (
        document.visibilityState === 'visible'
        && current
        && requestCountRef.current === 0
        && currentTime - Math.max(
          current.fetchedAt,
          lastRevalidationAttemptRef.current,
        ) >= EVENTS_CACHE_TTL_MS
      ) {
        lastRevalidationAttemptRef.current = currentTime;
        void requestEvents({ forceRefresh: true });
      }
    };
    const timer = window.setInterval(updateNowAndRevalidate, 60_000);
    window.addEventListener("focus", updateNowAndRevalidate);
    document.addEventListener("visibilitychange", updateNowAndRevalidate);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateNowAndRevalidate);
      document.removeEventListener("visibilitychange", updateNowAndRevalidate);
    };
  }, [requestEvents]);

  useEffect(() => {
    const syncTarget = () => {
      setTargetEventId(getHashQueryParam(window.location.hash, "event"));
    };
    window.addEventListener("hashchange", syncTarget);
    return () => window.removeEventListener("hashchange", syncTarget);
  }, []);

  useEffect(() => {
    if (!targetEventId || !result) return;
    setFilter("all");
    const allGroups = groupAndSortEvents(result.events, Date.now());
    if (allGroups.ended.some((event) => event.eventID === targetEventId)) {
      setShowEnded(true);
    }
  }, [result, targetEventId]);

  useEffect(() => {
    if (!targetEventId || !result) return undefined;
    let clearTimer: number | undefined;
    const scrollTimer = window.setTimeout(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("[data-event-id]"),
      ).find((element) => element.dataset.eventId === targetEventId);
      if (!target) return;
      setHighlightedEventId(targetEventId);
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
      clearTimer = window.setTimeout(() => setHighlightedEventId(null), 2600);
    }, 40);
    return () => {
      window.clearTimeout(scrollTimer);
      if (clearTimer !== undefined) window.clearTimeout(clearTimer);
    };
  }, [filter, result, showEnded, targetEventId]);

  const filteredEvents = useMemo(() => {
    const events = result?.events ?? [];
    return filter === "all"
      ? events
      : events.filter((event) => getEventCategory(event.eventType) === filter);
  }, [filter, result]);

  const groups = useMemo(
    () => groupAndSortEvents(filteredEvents, now),
    [filteredEvents, now],
  );

  return (
    <div className="events-page">
      <header className="page-heading events-page__heading">
        <div>
          <h1>イベント</h1>
        </div>
        {result ? (
          <div className="events-page__update">
            <span>最終更新 {formatLastUpdated(result.fetchedAt)}</span>
            <RefreshButton
              loading={loading && Boolean(result)}
              onClick={() => requestEvents({ forceRefresh: true })}
            />
          </div>
        ) : null}
      </header>

      {result?.stale ? (
        <div className="events-notice" role="status">
          通信に失敗したため、保存済みのイベント情報を表示しています。
        </div>
      ) : null}

      {loading && !result ? (
        <EventSkeleton />
      ) : error && !result ? (
        <div className="events-error" role="alert">
          <p>イベント情報を取得できませんでした</p>
          <RefreshButton
            loading={loading}
            onClick={() => requestEvents({ forceRefresh: true })}
          />
        </div>
      ) : result ? (
        <>
          <EventFilters selected={filter} onChange={setFilter} />

          <div className="events-page__sections" aria-busy={loading}>
            <EventSection
              title="開催中"
              emptyMessage="現在開催中のイベントはありません。"
              events={groups.ongoing}
              status="ongoing"
              now={now}
              highlightedEventId={highlightedEventId}
            />
            <EventSection
              title="今後のイベント"
              emptyMessage="開催予定のイベントはありません。"
              events={groups.upcoming}
              status="upcoming"
              now={now}
              highlightedEventId={highlightedEventId}
            />

            <section className="events-section events-section--ended" aria-labelledby="ended-events-title">
              <button
                className="events-section__toggle"
                type="button"
                aria-expanded={showEnded}
                aria-controls="ended-events-panel"
                onClick={() => setShowEnded((current) => !current)}
              >
                <span id="ended-events-title">
                  {showEnded
                    ? "終了したイベントを非表示"
                    : "終了したイベントを表示"}
                </span>
                <span className="events-section__count">{groups.ended.length}</span>
              </button>
              {showEnded ? (
                <div id="ended-events-panel">
                  {groups.ended.length > 0 ? (
                    <div className="event-list">
                      {groups.ended.map((event, index) => (
                        <div
                          className={`search-target-anchor${highlightedEventId === event.eventID ? " is-search-target" : ""}`}
                          data-event-id={event.eventID}
                          key={`${event.eventID}-ended-${index}`}
                        >
                          <EventCard event={event} status="ended" now={now} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="events-section__empty">
                      終了したイベントはありません。
                    </p>
                  )}
                </div>
              ) : null}
            </section>

            {groups.unknown.length > 0 ? (
              <EventSection
                title="日時未定"
                emptyMessage=""
                events={groups.unknown}
                status="unknown"
                now={now}
                highlightedEventId={highlightedEventId}
              />
            ) : null}
          </div>
        </>
      ) : null}

      <footer className="events-credit">
        <span>Data provided by </span>
        <a href="https://leekduck.com/" target="_blank" rel="noopener noreferrer">
          Leek Duck
        </a>
        <span> / </span>
        <a
          href="https://github.com/bigfoott/ScrapedDuck"
          target="_blank"
          rel="noopener noreferrer"
        >
          ScrapedDuck
        </a>
      </footer>
    </div>
  );
}

export default EventsPage;
