import { describe, expect, it, vi } from 'vitest';
import { shareCurrentSite, SITE_SHARE_TITLE } from './siteShare';

describe('site sharing', () => {
  const url = 'https://shiropoke.github.io/PokemonGO/#/raids';

  it('Web Share APIが利用できる場合は現在URLを共有する', async () => {
    const share = vi.fn(async () => undefined);

    await expect(shareCurrentSite({ share }, url)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: SITE_SHARE_TITLE, url });
  });

  it('Web Share API非対応時はClipboard APIへフォールバックする', async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(shareCurrentSite({ clipboard: { writeText } }, url)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it('共有失敗時もClipboard APIを試す', async () => {
    const share = vi.fn(async () => { throw new Error('share failed'); });
    const writeText = vi.fn(async () => undefined);

    await expect(
      shareCurrentSite({ share, clipboard: { writeText } }, url),
    ).resolves.toBe('copied');
  });

  it('共有画面のキャンセルはエラー扱いしない', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    const writeText = vi.fn(async () => undefined);

    await expect(
      shareCurrentSite({ share, clipboard: { writeText } }, url),
    ).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('共有手段がない場合はfailedを返す', async () => {
    await expect(shareCurrentSite({}, url)).resolves.toBe('failed');
  });
});
