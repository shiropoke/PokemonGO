import { getPageFromHash, getPageHash } from '../types/navigation';

/** settings自身や不正な値を戻り先にせず、サイト外へ戻らないhashを返す。 */
export function resolveSettingsReturnHash(hash: string | null | undefined): string {
  if (!hash || getPageFromHash(hash) === 'settings') return getPageHash('home');
  return hash;
}
