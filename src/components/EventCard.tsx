import { useEffect, useId, useMemo, useState } from "react";
import type { EventTimingStatus, ScrapedDuckEvent } from "../types/events";
import {
  formatEventDate,
  getEventCountdown,
  parseEventDate,
} from "../utils/date";
import {
  getEventTypeLabel,
  localizeEventTitle,
} from "../utils/eventLocalization";
import { parseEventSummary } from "../utils/eventDetails";
import { safeExternalUrl } from "../utils/url";
import "../styles/event-details.css";

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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const imageUrl = safeExternalUrl(event.image);
  const eventUrl = safeExternalUrl(event.link);
  const startDate = parseEventDate(event.start);
  const endDate = parseEventDate(event.end);
  const localizedTitle = localizeEventTitle(event.name);
  const summary = useMemo(() => parseEventSummary(event), [event]);
  const hasSummary = Boolean(
    summary.description ||
      summary.bonuses.length ||
      summary.pokemon.length ||
      summary.other.length,
  );

  useEffect(() => {
    setImageFailed(false);
  }, [event.image]);

  useEffect(() => {
    setExpanded(false);
  }, [event.eventID]);

  const media = (
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
  );

  return (
    <article className="event-card" data-status={status}>
      {eventUrl ? (
        <a
          className="event-card__media-link"
          href={eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${localizedTitle}を外部サイトで詳しく見る`}
        >
          {media}
        </a>
      ) : media}

      <div className="event-card__body">
        <div className="event-card__main">
          <div className="event-card__meta">
            <span className="event-card__status" data-status={status}>
              {STATUS_LABELS[status]}
            </span>
            <span className="event-card__type">
              {getEventTypeLabel(event.eventType)}
            </span>
          </div>

          <h3 className="event-card__title">{localizedTitle}</h3>

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
            <button
              className="event-card__details-toggle"
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpanded((current) => !current)}
            >
              詳細
              <svg
                className="event-card__details-chevron"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="event-card__details-panel"
          id={panelId}
          data-open={expanded}
          aria-hidden={!expanded}
          role="region"
          aria-label={`${localizedTitle}の簡易詳細`}
        >
          <div className="event-card__details-inner">
            <div className="event-card__details-content">
              {summary.description ? (
                <section className="event-card__details-section">
                  <h4>概要</h4>
                  <p>{summary.description}</p>
                </section>
              ) : null}
              {summary.bonuses.length > 0 ? (
                <SummaryList title="ボーナス" items={summary.bonuses} />
              ) : null}
              {summary.pokemon.length > 0 ? (
                <SummaryList title="対象ポケモン" items={summary.pokemon} />
              ) : null}
              {summary.other.length > 0 ? (
                <SummaryList title="その他" items={summary.other} />
              ) : null}
              {!hasSummary ? (
                <p className="event-card__details-empty">
                  このイベントの追加情報は提供されていません。
                </p>
              ) : null}
              {eventUrl ? (
                <a
                  className="event-card__external"
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  外部サイトで詳しく見る
                  <span className="sr-only">（新しいタブで開く）</span>
                  <ExternalLinkIcon />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="event-card__details-section">
      <h4>{title}</h4>
      <ul className="event-card__details-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
