import type { ReactNode } from 'react';
import { formatLastUpdated } from '../utils/date';

interface DatasetPageHeaderProps {
  eyebrow?: string;
  title: string;
  fetchedAt?: number;
}

export function DatasetPageHeader({
  eyebrow,
  title,
  fetchedAt,
}: DatasetPageHeaderProps) {
  return (
    <header className="page-heading dataset-page__heading">
      <div>
        {eyebrow ? <p className="page-heading__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>
      {fetchedAt !== undefined ? (
        <div className="dataset-page__update">
          <span>最終更新 {formatLastUpdated(fetchedAt)}</span>
        </div>
      ) : null}
    </header>
  );
}

export function DatasetSkeleton() {
  return (
    <div className="dataset-skeleton" aria-label="情報を読み込んでいます" role="status">
      {[0, 1, 2].map((item) => (
        <span key={item} />
      ))}
    </div>
  );
}

export function DatasetError({
  onRetry,
  action,
}: {
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="dataset-error" role="alert">
      <p>情報を取得できませんでした</p>
      {action ?? (
        onRetry ? <button type="button" onClick={onRetry}>再試行</button> : null
      )}
    </div>
  );
}

export function StaleDataNotice() {
  return (
    <div className="dataset-notice" role="status">
      通信に失敗したため、保存済みデータを表示しています。
    </div>
  );
}

export function ScrapedDuckCredit() {
  return (
    <footer className="dataset-credit">
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
  );
}

/** レイドの現在出現判定と、ポケモン固有情報の補完元を明示する。 */
export function RaidDataCredit() {
  return (
    <footer className="dataset-credit">
      <span>レイド情報: </span>
      <a href="https://leekduck.com/" target="_blank" rel="noopener noreferrer">Leek Duck</a>
      <span>・</span>
      <a href="https://github.com/bigfoott/ScrapedDuck" target="_blank" rel="noopener noreferrer">ScrapedDuck</a>
      <span> ／ ポケモン詳細データ: </span>
      <a href="https://pogoapi.net/" target="_blank" rel="noopener noreferrer">PoGoAPI</a>
      <span>・</span>
      <a href="https://github.com/WatWowMap/pogo-data-api" target="_blank" rel="noopener noreferrer">WatWowMap</a>
      <span>・</span>
      <a href="https://github.com/PokeMiners/pogo_assets" target="_blank" rel="noopener noreferrer">PokeMiners</a>
    </footer>
  );
}
