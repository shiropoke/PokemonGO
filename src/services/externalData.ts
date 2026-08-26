import {
  ExternalDataFetchError,
  ExternalDataValidationError,
  type ExternalDataRequestOptions,
  type ExternalDataResult,
  type ExternalDataSource,
} from '../types/externalData';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_MEMORY_TTL_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 150;

export type ExternalDataParser<T> = (value: unknown) => T;

interface ExternalJsonClientOptions<TSource extends ExternalDataSource> {
  source: TSource;
  memoryTtlMs?: number;
}

interface MemoryEntry<TSource extends ExternalDataSource> {
  result: ExternalDataResult<unknown, TSource>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function retryable(error: unknown): boolean {
  return error instanceof ExternalDataFetchError
    && (
      error.failure === 'network'
      || error.failure === 'timeout'
      || (error.failure === 'http'
        && error.status !== null
        && error.status >= 500)
    );
}

async function fetchJsonOnce(
  source: ExternalDataSource,
  endpoint: string,
  forceRefresh: boolean,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        cache: forceRefresh ? 'no-store' : 'default',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      throw new ExternalDataFetchError(
        source,
        endpoint,
        timedOut ? 'timeout' : 'network',
        null,
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new ExternalDataFetchError(
        source,
        endpoint,
        'http',
        response.status,
      );
    }

    try {
      return await response.json() as unknown;
    } catch (error) {
      throw new ExternalDataFetchError(
        source,
        endpoint,
        'invalid-json',
        response.status,
        { cause: error },
      );
    }
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function waitForCaller<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  source: ExternalDataSource,
  endpoint: string,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(
      new ExternalDataFetchError(source, endpoint, 'aborted'),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new ExternalDataFetchError(source, endpoint, 'aborted'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export function createExternalJsonClient<
  TSource extends ExternalDataSource,
>({
  source,
  memoryTtlMs = DEFAULT_MEMORY_TTL_MS,
}: ExternalJsonClientOptions<TSource>) {
  const memory = new Map<string, MemoryEntry<TSource>>();
  const inFlight = new Map<
    string,
    Promise<ExternalDataResult<unknown, TSource>>
  >();

  async function request<T>(
    endpoint: string,
    parse: ExternalDataParser<T>,
    options: ExternalDataRequestOptions = {},
  ): Promise<ExternalDataResult<T, TSource>> {
    if (options.signal?.aborted) {
      throw new ExternalDataFetchError(source, endpoint, 'aborted');
    }
    const forceRefresh = Boolean(options.forceRefresh);
    const cached = memory.get(endpoint)?.result;
    if (
      !forceRefresh
      && cached
      && Date.now() - cached.fetchedAt < memoryTtlMs
    ) {
      return cached as ExternalDataResult<T, TSource>;
    }

    const requestKey = `${forceRefresh ? 'force' : 'normal'}:${endpoint}`;
    let shared = inFlight.get(requestKey);
    if (!shared) {
      const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const timeoutMs = Number.isFinite(requestedTimeout)
        ? Math.max(1, Math.trunc(requestedTimeout))
        : DEFAULT_TIMEOUT_MS;
      const requestedRetryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;
      const retryCount = Number.isFinite(requestedRetryCount)
        ? Math.max(0, Math.trunc(requestedRetryCount))
        : DEFAULT_RETRY_COUNT;
      shared = (async () => {
        let attempt = 0;
        while (true) {
          try {
            const value = await fetchJsonOnce(
              source,
              endpoint,
              forceRefresh,
              timeoutMs,
            );
            let data: T;
            try {
              data = parse(value);
            } catch (error) {
              throw error instanceof ExternalDataValidationError
                ? error
                : new ExternalDataValidationError(source, endpoint, {
                    cause: error,
                  });
            }
            const result: ExternalDataResult<T, TSource> = {
              source,
              endpoint,
              fetchedAt: Date.now(),
              data,
            };
            memory.set(endpoint, { result });
            return result;
          } catch (error) {
            if (attempt >= retryCount || !retryable(error)) throw error;
            attempt += 1;
            await delay(RETRY_DELAY_MS);
          }
        }
      })();
      const stored = shared as Promise<ExternalDataResult<unknown, TSource>>;
      inFlight.set(requestKey, stored);
      const clear = () => {
        if (inFlight.get(requestKey) === stored) inFlight.delete(requestKey);
      };
      void stored.then(clear, clear);
    }

    return waitForCaller(
      shared as Promise<ExternalDataResult<T, TSource>>,
      options.signal,
      source,
      endpoint,
    );
  }

  return { request };
}
