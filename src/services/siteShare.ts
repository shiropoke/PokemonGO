export const SITE_SHARE_TITLE = 'GO Scope';

export type SiteShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: {
    writeText(value: string): Promise<void>;
  };
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error
    && error.name === 'AbortError';
}

async function copyUrl(
  navigatorLike: ShareNavigator,
  url: string,
): Promise<SiteShareResult> {
  if (!navigatorLike.clipboard?.writeText) return 'failed';

  try {
    await navigatorLike.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function shareCurrentSite(
  navigatorLike: ShareNavigator,
  url: string,
): Promise<SiteShareResult> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share({ title: SITE_SHARE_TITLE, url });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
      return copyUrl(navigatorLike, url);
    }
  }

  return copyUrl(navigatorLike, url);
}
