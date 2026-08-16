export function EventSkeleton() {
  return (
    <div className="event-skeleton-list" role="status" aria-label="イベント情報を読み込み中">
      {[0, 1, 2].map((index) => (
        <div className="event-skeleton" aria-hidden="true" key={index}>
          <div className="event-skeleton__image" />
          <div className="event-skeleton__content">
            <div className="event-skeleton__line event-skeleton__line--short" />
            <div className="event-skeleton__line event-skeleton__line--title" />
            <div className="event-skeleton__line" />
            <div className="event-skeleton__line event-skeleton__line--short" />
          </div>
        </div>
      ))}
      <span className="sr-only">イベント情報を読み込んでいます</span>
    </div>
  );
}
