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
  | 'favorites'
  | 'terms'
  | 'privacy';

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
  terms: 'terms',
  privacy: 'privacy',
};

export type NavigationQuery = Record<
  string,
  string | number | boolean | null | undefined
>;

export function getPageFromHash(hash: string): Page {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const entry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, route]) => route === path,
  );
  return entry?.[0] ?? 'home';
}

export function getHashQueryParam(hash: string, name: string): string | null {
  const query = hash.split('?')[1];
  if (!query) return null;
  const value = new URLSearchParams(query).get(name)?.trim() ?? '';
  return value || null;
}

export function getPageHash(page: Page, query?: NavigationQuery): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && String(value).length > 0) {
      params.set(name, String(value));
    }
  }
  const serialized = params.toString();
  return `#/${PAGE_PATHS[page]}${serialized ? `?${serialized}` : ''}`;
}

const PAGE_TITLES: Record<Page, string> = {
  home: 'GO Scope',
  events: 'イベント | GO Scope',
  raids: 'レイド | GO Scope',
  iv: '個体値チェッカー | GO Scope',
  evolution: '進化後CP | GO Scope',
  'power-up': '強化コスト | GO Scope',
  moves: 'わざ性能 | GO Scope',
  'pvp-rankings': 'PvPランキング | GO Scope',
  research: 'フィールドリサーチ | GO Scope',
  eggs: 'タマゴ | GO Scope',
  rocket: 'GOロケット団 | GO Scope',
  favorites: 'お気に入り | GO Scope',
  terms: '利用規約 | GO Scope',
  privacy: 'プライバシーポリシー | GO Scope',
};

export function getPageTitle(page: Page): string {
  return PAGE_TITLES[page];
}
