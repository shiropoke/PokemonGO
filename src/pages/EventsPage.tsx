import { useCallback, useEffect, useMemo, useState } from "react";
import { EventCard } from "../components/EventCard";
import { EventFilters } from "../components/EventFilters";
import { EventSkeleton } from "../components/EventSkeleton";
import { loadEvents } from "../services/events";
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

interface EventSectionProps {
  title: string;
  emptyMessage: string;
  events: ScrapedDuckEvent[];
  status: EventTimingStatus;
  now: number;
}

function EventSection({
  title,
  emptyMessage,
  events,
  status,
  now,
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
            <EventCard
              event={event}
              status={status}
              now={now}
              key={`${event.eventID}-${index}`}
            />
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<EventCategory>("all");
  const [showEnded, setShowEnded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const requestEvents = useCallback(
    async (signal?: AbortSignal) => {
      if (result) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(false);

      try {
        const nextResult = await loadEvents({ signal });
        if (!signal?.aborted) {
          setResult(nextResult);
          setNow(Date.now());
        }
      } catch {
        if (!signal?.aborted) {
          setError(true);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [result],
  );

  useEffect(() => {
    const controller = new AbortController();
    void requestEvents(controller.signal);
    return () => controller.abort();
    // The initial request intentionally runs once. Manual refreshes use the same
    // callback without restarting this effect when data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const timer = window.setInterval(updateNow, 60_000);
    window.addEventListener("focus", updateNow);
    document.addEventListener("visibilitychange", updateNow);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateNow);
      document.removeEventListener("visibilitychange", updateNow);
    };
  }, []);

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
          <p className="page-heading__eyebrow">Pokémon GO</p>
          <h1>イベント</h1>
        </div>
        {result ? (
          <div className="events-page__update">
            <span>最終更新 {formatLastUpdated(result.fetchedAt)}</span>
            <button
              className="events-page__refresh"
              type="button"
              onClick={() => void requestEvents()}
              disabled={refreshing}
            >
              {refreshing ? "取得中" : "再取得"}
            </button>
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
          <button type="button" onClick={() => void requestEvents()}>
            再取得
          </button>
        </div>
      ) : result ? (
        <>
          <EventFilters selected={filter} onChange={setFilter} />

          <div className="events-page__sections" aria-busy={refreshing}>
            <EventSection
              title="開催中"
              emptyMessage="現在開催中のイベントはありません。"
              events={groups.ongoing}
              status="ongoing"
              now={now}
            />
            <EventSection
              title="今後のイベント"
              emptyMessage="開催予定のイベントはありません。"
              events={groups.upcoming}
              status="upcoming"
              now={now}
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
                        <EventCard
                          event={event}
                          status="ended"
                          now={now}
                          key={`${event.eventID}-ended-${index}`}
                        />
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
              />
            ) : null}
          </div>
        </>
      ) : null}

      <footer className="events-credit">
        <span>Event data provided by </span>
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
