import { useEffect, useState, type ReactNode } from "react";
import type { EventTimingStatus, ScrapedDuckEvent } from "../types/events";
import {
  formatEventDate,
  getEventCategory,
  getEventCategoryLabel,
  getEventCountdown,
  parseEventDate,
} from "../utils/date";

interface EventCardProps {
  event: ScrapedDuckEvent;
  status: EventTimingStatus;
  now: number;
}

const STATUS_LABELS: Record<EventTimingStatus, string> = {
  ongoing: "開催中",
  upcoming: "開催予定",
  ended: "終了済み",
  unknown: "日時未定",
};

function safeExternalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function ExternalLinkIcon() {
  return (
    <svg
      className="event-card__external-icon"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M11.5 3.5h5v5M9 11l7.25-7.25M15.5 11v4.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1H9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EventCard({ event, status, now }: EventCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = safeExternalUrl(event.image);
  const eventUrl = safeExternalUrl(event.link);
  const startDate = parseEventDate(event.start);
  const endDate = parseEventDate(event.end);
  const category = getEventCategory(event.eventType);

  useEffect(() => {
    setImageFailed(false);
  }, [event.image]);

  const cardContent: ReactNode = (
    <article className="event-card" data-status={status}>
      <div className="event-card__media">
        {imageUrl && !imageFailed ? (
          <img
            className="event-card__image"
            src={imageUrl}
            alt=""
            width="640"
            height="360"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="event-card__image-placeholder" aria-hidden="true">
            画像なし
          </div>
        )}
      </div>

      <div className="event-card__body">
        <div className="event-card__meta">
          <span className="event-card__status" data-status={status}>
            {STATUS_LABELS[status]}
          </span>
          <span className="event-card__type">{getEventCategoryLabel(category)}</span>
        </div>

        <h3 className="event-card__title">{event.name}</h3>

        <dl className="event-card__dates">
          <div className="event-card__date-row">
            <dt>開始</dt>
            <dd>
              {startDate ? (
                <time dateTime={startDate.toISOString()}>
                  {formatEventDate(startDate, new Date(now))}
                </time>
              ) : (
                "未定"
              )}
            </dd>
          </div>
          <div className="event-card__date-row">
            <dt>終了</dt>
            <dd>
              {endDate ? (
                <time dateTime={endDate.toISOString()}>
                  {formatEventDate(endDate, new Date(now))}
                </time>
              ) : (
                "未定"
              )}
            </dd>
          </div>
        </dl>

        <div className="event-card__footer">
          <p className="event-card__countdown">
            {getEventCountdown(event, status, now)}
          </p>
          {eventUrl ? (
            <span className="event-card__external">
              詳細を見る
              <span className="sr-only">（外部サイト）</span>
              <ExternalLinkIcon />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  return eventUrl ? (
    <a
      className="event-card-link"
      href={eventUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${event.name}の詳細を外部サイトで開く`}
    >
      {cardContent}
    </a>
  ) : (
    <div className="event-card-link event-card-link--disabled">{cardContent}</div>
  );
}
