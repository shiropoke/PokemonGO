import { useMemo, useState } from 'react';
import type { ScrapedDuckEvent } from '../types/events';
import { getEventCategory } from '../utils/date';
import { localizeEventTitle } from '../utils/eventLocalization';
import { safeExternalUrl } from '../utils/url';
import {
  formatWeeklyDayHeading,
  formatWeeklyEventRange,
  getJapaneseWeekRange,
  getWeeklyEventCalendarSpan,
  groupWeeklyEvents,
  readWeeklyEventView,
  saveWeeklyEventView,
  type WeeklyEventView,
} from '../utils/weeklyEvents';

interface WeeklyEventsProps {
  events: readonly ScrapedDuckEvent[];
  now: number;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function EventLink({
  event,
  className,
  children,
  style,
}: {
  event: ScrapedDuckEvent;
  className: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const url = safeExternalUrl(event.link);
  return (
    <a
      className={className}
      href={url ?? '#/events'}
      target={url ? '_blank' : undefined}
      rel={url ? 'noreferrer' : undefined}
      style={style}
    >
      {children}
    </a>
  );
}

export function WeeklyEvents({ events, now }: WeeklyEventsProps) {
  const [view, setView] = useState<WeeklyEventView>(() =>
    readWeeklyEventView(getBrowserStorage()),
  );
  const range = useMemo(() => getJapaneseWeekRange(now), [now]);
  const groups = useMemo(() => groupWeeklyEvents(events, now), [events, now]);

  const changeView = (nextView: WeeklyEventView) => {
    setView(nextView);
    saveWeeklyEventView(nextView, getBrowserStorage());
  };

  return (
    <div className="weekly-events">
      <div className="weekly-events__toolbar">
        <div className="weekly-view-switch" role="group" aria-label="今週のイベント表示">
          <button
            type="button"
            className={view === 'list' ? 'is-active' : undefined}
            aria-pressed={view === 'list'}
            onClick={() => changeView('list')}
          >
            リスト
          </button>
          <button
            type="button"
            className={view === 'calendar' ? 'is-active' : undefined}
            aria-pressed={view === 'calendar'}
            onClick={() => changeView('calendar')}
          >
            カレンダー
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="dashboard-empty">今週のイベントはありません。</p>
      ) : view === 'list' ? (
        <div className="weekly-events__view weekly-event-list" key="list">
          {groups.map((group) => (
            <section className="weekly-event-day" key={group.date.toISOString()}>
              <h3>{formatWeeklyDayHeading(group.date)}</h3>
              <div className="weekly-event-day__items">
                {group.events.map((event, index) => (
                  <EventLink
                    className="weekly-event-list__item"
                    event={event}
                    key={`${event.eventID}-${index}`}
                  >
                    <strong>{localizeEventTitle(event.name)}</strong>
                    <span>{formatWeeklyEventRange(event)}</span>
                  </EventLink>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="weekly-events__view week-calendar-scroll" key="calendar">
          <div className="week-calendar">
            <div className="week-calendar__days" aria-hidden="true">
              {range.days.map((day) => {
                const dayOfWeek = day.getDay();
                const classes = [
                  isSameLocalDay(day, new Date(now)) ? 'is-today' : '',
                  dayOfWeek === 6 ? 'is-saturday' : '',
                  dayOfWeek === 0 ? 'is-sunday' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <span className={classes || undefined} key={day.toISOString()}>
                    <strong>{day.getDate()}</strong>
                    <small>（{['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]}）</small>
                  </span>
                );
              })}
            </div>
            <div className="week-calendar__events">
              {events.map((event, index) => {
                const span = getWeeklyEventCalendarSpan(event, now);
                if (!span) return null;
                const category = getEventCategory(event.eventType);
                return (
                  <div className="week-calendar__row" key={`${event.eventID}-${index}`}>
                    <EventLink
                      className={`week-calendar__event week-calendar__event--${category}`}
                      event={event}
                      style={{ gridColumn: `${span.startColumn} / ${span.endColumn}` }}
                    >
                      <strong>{localizeEventTitle(event.name)}</strong>
                      <small>{formatWeeklyEventRange(event)}</small>
                    </EventLink>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
