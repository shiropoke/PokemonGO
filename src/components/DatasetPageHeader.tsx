import type { ReactNode } from 'react';
import { formatLastUpdated } from '../utils/date';

interface DatasetPageHeaderProps {
  eyebrow: string;
  title: string;
  fetchedAt?: number;
  refreshing?: boolean;
  onReload?: () => void;
  action?: ReactNode;
}

export function DatasetPageHeader({
  eyebrow,
  title,
  fetchedAt,
  refreshing,
  onReload,
  action,
}: DatasetPageHeaderProps) {
  return (
    <header className="page-heading dataset-page__heading">
      <div>
        <p className="page-heading__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {fetchedAt !== undefined ? (
        <div className="dataset-page__update">
          <span>最終更新 {formatLastUpdated(fetchedAt)}</span>
          {action ?? (onReload ? (
            <button type="button" onClick={onReload} disabled={refreshing}>
              {refreshing ? '取得中' : '更新確認'}
            </button>
          ) : null)}
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
