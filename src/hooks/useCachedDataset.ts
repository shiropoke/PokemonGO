import { useCallback, useEffect, useRef, useState } from 'react';
import type { CachedDataResult, DatasetLoadOptions } from '../types/scrapedDuck';

type DatasetLoader<T> = (
  options?: DatasetLoadOptions,
) => Promise<CachedDataResult<T>>;

export function useCachedDataset<T>(loader: DatasetLoader<T>) {
  const [result, setResult] = useState<CachedDataResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const resultRef = useRef<CachedDataResult<T> | null>(null);

  const request = useCallback(
    async (signal?: AbortSignal) => {
      if (resultRef.current) setRefreshing(true);
      else setLoading(true);
      setError(false);

      try {
        const next = await loader({ signal });
        if (!signal?.aborted) {
          resultRef.current = next;
          setResult(next);
        }
      } catch {
        if (!signal?.aborted) setError(true);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader],
  );

  useEffect(() => {
    const controller = new AbortController();
    void request(controller.signal);
    return () => controller.abort();
  }, [request]);

  return {
    result,
    loading,
    refreshing,
    error,
    reload: () => request(),
  };
}
