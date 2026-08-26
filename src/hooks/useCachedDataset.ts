import { useCallback, useEffect, useRef, useState } from 'react';
import type { CachedDataResult, DatasetLoadOptions } from '../types/scrapedDuck';

type DatasetLoader<T> = (
  options?: DatasetLoadOptions,
) => Promise<CachedDataResult<T>>;

interface CachedDatasetHookOptions {
  revalidateOnFocus?: boolean;
  staleTimeMs?: number;
}

type DatasetReloadOptions = Omit<DatasetLoadOptions, 'signal'>;

export function shouldRevalidateDataset(
  fetchedAt: number,
  now: number,
  staleTimeMs: number,
): boolean {
  return now - fetchedAt >= staleTimeMs;
}

export function useCachedDataset<T>(
  loader: DatasetLoader<T>,
  options: CachedDatasetHookOptions = {},
) {
  const [result, setResult] = useState<CachedDataResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const resultRef = useRef<CachedDataResult<T> | null>(null);
  const requestCountRef = useRef(0);
  const lastRevalidationAttemptRef = useRef(0);

  const request = useCallback(
    async (
      loadOptions: DatasetReloadOptions = {},
      signal?: AbortSignal,
    ) => {
      requestCountRef.current += 1;
      if (resultRef.current) setRefreshing(true);
      else setLoading(true);
      setError(false);

      try {
        const next = await loader({ ...loadOptions, signal });
        if (!signal?.aborted) {
          resultRef.current = next;
          setResult(next);
        }
      } catch {
        if (!signal?.aborted) setError(true);
      } finally {
        requestCountRef.current = Math.max(0, requestCountRef.current - 1);
        if (!signal?.aborted && requestCountRef.current === 0) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader],
  );

  useEffect(() => {
    const controller = new AbortController();
    void request({}, controller.signal);
    return () => controller.abort();
  }, [request]);

  useEffect(() => {
    if (!options.revalidateOnFocus || !options.staleTimeMs) return undefined;

    const revalidateIfNeeded = () => {
      if (document.visibilityState !== 'visible') return;
      const current = resultRef.current;
      const now = Date.now();
      if (
        !current
        || requestCountRef.current > 0
        || !shouldRevalidateDataset(
          Math.max(current.fetchedAt, lastRevalidationAttemptRef.current),
          now,
          options.staleTimeMs!,
        )
      ) return;
      lastRevalidationAttemptRef.current = now;
      void request({ forceRefresh: true });
    };

    const onVisibilityChange = () => revalidateIfNeeded();
    const timer = window.setInterval(
      revalidateIfNeeded,
      options.staleTimeMs,
    );
    window.addEventListener('focus', revalidateIfNeeded);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', revalidateIfNeeded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [options.revalidateOnFocus, options.staleTimeMs, request]);

  const reload = useCallback(
    (loadOptions: DatasetReloadOptions = {}) => request(loadOptions),
    [request],
  );
  const refresh = useCallback(
    () => request({ forceRefresh: true }),
    [request],
  );

  return {
    result,
    loading,
    refreshing,
    error,
    reload,
    refresh,
  };
}
