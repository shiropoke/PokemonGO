export type Page =
  | 'home'
  | 'events'
  | 'raids'
  | 'iv'
  | 'evolution'
  | 'power-up'
  | 'moves'
  | 'pvp-rankings'
  | 'research'
  | 'eggs'
  | 'rocket'
  | 'favorites';

export const PAGE_PATHS: Record<Page, string> = {
  home: 'home',
  events: 'events',
  raids: 'raids',
  iv: 'iv-checker',
  evolution: 'evolution-cp',
  'power-up': 'power-up',
  moves: 'moves',
  'pvp-rankings': 'pvp-rankings',
  research: 'research',
  eggs: 'eggs',
  rocket: 'rocket',
  favorites: 'favorites',
};

export function getPageFromHash(hash: string): Page {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const entry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, route]) => route === path,
  );
  return entry?.[0] ?? 'home';
}

export function getPageHash(page: Page): string {
  return `#/${PAGE_PATHS[page]}`;
}
