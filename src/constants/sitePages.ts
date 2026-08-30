import type { Page } from '../types/navigation';

export type SitePageGroup = 'primary' | 'tools' | 'other';

export interface SitePageDefinition {
  page: Page;
  label: string;
  group: SitePageGroup;
  primary: boolean;
  popularSearch?: boolean;
  keywords: readonly string[];
}

export const SITE_PAGES: readonly SitePageDefinition[] = [
  {
    page: 'home',
    label: 'ホーム',
    group: 'primary',
    primary: true,
    keywords: ['トップ', '今日'],
  },
  {
    page: 'events',
    label: 'イベント',
    group: 'primary',
    primary: true,
    popularSearch: true,
    keywords: ['開催中', '予定', 'スケジュール'],
  },
  {
    page: 'raids',
    label: 'レイド',
    group: 'primary',
    primary: true,
    popularSearch: true,
    keywords: ['レイドボス', '対策', 'ボス'],
  },
  {
    page: 'iv',
    label: '個体値チェッカー',
    group: 'tools',
    primary: true,
    popularSearch: true,
    keywords: ['個体値', 'IV', 'CP', 'PvP個体値'],
  },
  {
    page: 'evolution',
    label: '進化後CP',
    group: 'tools',
    primary: false,
    keywords: ['進化', 'CPシミュレーター'],
  },
  {
    page: 'power-up',
    label: '強化コスト',
    group: 'tools',
    primary: false,
    keywords: ['強化', '育成', 'ほしのすな', 'アメXL'],
  },
  {
    page: 'moves',
    label: 'わざ性能',
    group: 'tools',
    primary: false,
    keywords: ['技', 'わざ', 'DPS', 'DPT', 'EPT'],
  },
  {
    page: 'pvp-rankings',
    label: 'PvPランキング',
    group: 'other',
    primary: false,
    popularSearch: true,
    keywords: ['対戦', 'スーパーリーグ', 'ハイパーリーグ', 'マスターリーグ'],
  },
  {
    page: 'research',
    label: 'フィールドリサーチ',
    group: 'other',
    primary: false,
    keywords: ['リサーチ', 'タスク', '報酬'],
  },
  {
    page: 'eggs',
    label: 'タマゴ',
    group: 'other',
    primary: false,
    keywords: ['たまご', '孵化', 'ふか'],
  },
  {
    page: 'rocket',
    label: 'GOロケット団',
    group: 'other',
    primary: false,
    keywords: ['ロケット団', 'したっぱ', 'リーダー', 'サカキ'],
  },
  {
    page: 'pokemon',
    label: 'ポケモン図鑑',
    group: 'other',
    primary: false,
    keywords: ['図鑑', 'ポケモン', 'フォーム', '種族値'],
  },
  {
    page: 'pokefuta',
    label: 'ポケふた',
    group: 'other',
    primary: false,
    popularSearch: true,
    keywords: ['ポケふた', 'ポケモンマンホール', 'マンホール', 'ご当地', '都道府県', '設置場所'],
  },
  {
    page: 'favorites',
    label: 'お気に入り',
    group: 'other',
    primary: false,
    keywords: ['ウォッチリスト', '保存'],
  },
  {
    page: 'contact',
    label: 'お問い合わせ',
    group: 'other',
    primary: false,
    keywords: ['問い合わせ', 'お問い合わせ', '連絡', '不具合報告', '要望'],
  },
] as const;

function navigationLinks(
  predicate: (definition: SitePageDefinition) => boolean,
): { page: Page; label: string }[] {
  return SITE_PAGES.filter(predicate).map(({ page, label }) => ({ page, label }));
}

export const PRIMARY_LINKS = navigationLinks(({ primary }) => primary);
export const TOOL_LINKS = navigationLinks(({ group }) => group === 'tools');
export const OTHER_LINKS = navigationLinks(({ group }) => group === 'other');
