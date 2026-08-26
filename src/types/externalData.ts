export type ExternalDataSource = 'pogoapi' | 'watwowmap';

export interface ExternalDataResult<
  T,
  TSource extends ExternalDataSource = ExternalDataSource,
> {
  source: TSource;
  endpoint: string;
  fetchedAt: number;
  data: T;
}

export interface ExternalDataRequestOptions {
  signal?: AbortSignal;
  /** メモリキャッシュとブラウザHTTPキャッシュを使わずに再取得する。 */
  forceRefresh?: boolean;
  timeoutMs?: number;
  /** 一時的な通信エラーと5xxに対する追加試行回数。 */
  retryCount?: number;
}

export type ExternalDataFetchFailure =
  | 'aborted'
  | 'timeout'
  | 'network'
  | 'http'
  | 'invalid-json';

export class ExternalDataError extends Error {
  constructor(
    message: string,
    public readonly source: ExternalDataSource,
    public readonly endpoint: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ExternalDataError';
  }
}

export class ExternalDataFetchError extends ExternalDataError {
  constructor(
    source: ExternalDataSource,
    endpoint: string,
    public readonly failure: ExternalDataFetchFailure,
    public readonly status: number | null = null,
    options?: ErrorOptions,
  ) {
    super(
      `外部データを取得できませんでした (${source}: ${failure})`,
      source,
      endpoint,
      options,
    );
    this.name = 'ExternalDataFetchError';
  }
}

export class ExternalDataValidationError extends ExternalDataError {
  constructor(
    source: ExternalDataSource,
    endpoint: string,
    options?: ErrorOptions,
  ) {
    super(
      `外部データの形式が正しくありません (${source})`,
      source,
      endpoint,
      options,
    );
    this.name = 'ExternalDataValidationError';
  }
}
