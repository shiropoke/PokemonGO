import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExternalJsonClient } from './externalData';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('external JSON transport', () => {
  it('timeoutをnetwork errorと区別する', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Timed out', 'AbortError'));
        });
      })));
    const client = createExternalJsonClient({ source: 'pogoapi' });
    const pending = client.request(
      'https://example.com/data.json',
      (value) => value,
      { timeoutMs: 10, retryCount: 0 },
    );
    const assertion = expect(pending).rejects.toMatchObject({ failure: 'timeout' });

    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('5xxを指定回数だけretryし、成功データを返す', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createExternalJsonClient({ source: 'watwowmap' });
    const pending = client.request(
      'https://example.com/data.json',
      (value) => value as { ok: boolean },
      { retryCount: 1 },
    );

    await vi.advanceTimersByTimeAsync(150);
    await expect(pending).resolves.toMatchObject({
      source: 'watwowmap',
      data: { ok: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('429は負荷を避けるためretryしない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createExternalJsonClient({ source: 'pogoapi' });

    await expect(client.request(
      'https://example.com/data.json',
      (value) => value,
      { retryCount: 2 },
    )).rejects.toMatchObject({ failure: 'http', status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
