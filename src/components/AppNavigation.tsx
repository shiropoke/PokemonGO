import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Page } from '../types/navigation';
import { getPageHash } from '../types/navigation';

type IconName = 'home' | 'calendar' | 'raid' | 'tools' | 'more' | 'star' | 'data';

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="m3.5 11 8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />,
    calendar: <path d="M7 3v3m10-3v3M4.5 9h15M5 5.5h14a1 1 0 0 1 1 1V20H4V6.5a1 1 0 0 1 1-1Z" />,
    raid: <path d="M12 3a7.5 7.5 0 1 0 7.5 7.5H12V3Zm2 0v5.5h5.5A7.5 7.5 0 0 0 14 3Z" />,
    tools: <path d="m14.5 5.5 4-2-2 4 3.5 3.5-4 4-3.5-3.5-7 7-2-2 7-7L7 6l4-4 3.5 3.5Z" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    star: <path d="m12 3 2.72 5.51 6.08.88-4.4 4.29 1.04 6.05L12 16.87l-5.44 2.86 1.04-6.05-4.4-4.29 6.08-.88L12 3Z" />,
    data: <path d="M5 4h14v5H5V4Zm0 7h14v9H5v-9Zm3 3h3m2 0h3m-8 3h8" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">{paths[name]}</svg>;
}

const TOOL_LINKS: { page: Page; label: string }[] = [
  { page: 'iv', label: '個体値チェッカー' },
  { page: 'evolution', label: '進化後CP' },
  { page: 'power-up', label: '強化コスト' },
  { page: 'moves', label: 'わざ性能' },
];

const DATA_LINKS: { page: Page; label: string }[] = [
  { page: 'pvp-rankings', label: 'PvPランキング' },
  { page: 'research', label: 'フィールドリサーチ' },
  { page: 'eggs', label: 'タマゴ' },
  { page: 'rocket', label: 'GOロケット団' },
  { page: 'favorites', label: 'お気に入り' },
];

function NavLink({ page, label, current, onNavigate }: { page: Page; label: string; current: Page; onNavigate(page: Page): void }) {
  return (
    <a
      className={current === page ? 'is-active' : ''}
      href={getPageHash(page)}
      aria-current={current === page ? 'page' : undefined}
      onClick={() => onNavigate(page)}
    >
      {label}
    </a>
  );
}

export function DesktopNavigation({ current, onNavigate }: { current: Page; onNavigate(page: Page): void }) {
  return (
    <nav className="desktop-nav desktop-nav--expanded" aria-label="メインナビゲーション">
      <NavLink page="home" label="ホーム" current={current} onNavigate={onNavigate} />
      <NavLink page="events" label="イベント" current={current} onNavigate={onNavigate} />
      <NavLink page="raids" label="レイド" current={current} onNavigate={onNavigate} />
      <details className={TOOL_LINKS.some((item) => item.page === current) ? 'is-active' : ''}>
        <summary>ツール</summary>
        <div className="desktop-nav__menu">
          {TOOL_LINKS.map((item) => <NavLink key={item.page} {...item} current={current} onNavigate={onNavigate} />)}
        </div>
      </details>
      <details className={DATA_LINKS.some((item) => item.page === current) ? 'is-active' : ''}>
        <summary>データ</summary>
        <div className="desktop-nav__menu">
          {DATA_LINKS.map((item) => <NavLink key={item.page} {...item} current={current} onNavigate={onNavigate} />)}
        </div>
      </details>
    </nav>
  );
}

export function MobileNavigation({ current, onNavigate }: { current: Page; onNavigate(page: Page): void }) {
  const [sheet, setSheet] = useState<'tools' | 'more' | null>(null);
  const navigate = (page: Page) => {
    setSheet(null);
    onNavigate(page);
  };
  const mainItems: { page: Page; label: string; icon: IconName }[] = [
    { page: 'home', label: 'ホーム', icon: 'home' },
    { page: 'events', label: 'イベント', icon: 'calendar' },
    { page: 'raids', label: 'レイド', icon: 'raid' },
  ];

  return (
    <>
      {sheet ? (
        <div className="mobile-nav-sheet" role="dialog" aria-label={sheet === 'tools' ? 'ツール' : 'その他'}>
          <button className="mobile-nav-sheet__backdrop" type="button" aria-label="メニューを閉じる" onClick={() => setSheet(null)} />
          <section>
            <header>
              <h2>{sheet === 'tools' ? 'ツール' : 'その他'}</h2>
              <button type="button" onClick={() => setSheet(null)}>閉じる</button>
            </header>
            <div>
              {(sheet === 'tools' ? TOOL_LINKS : DATA_LINKS).map((item) => (
                <button type="button" key={item.page} onClick={() => navigate(item.page)}>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
      <nav className="bottom-nav bottom-nav--expanded" aria-label="メインナビゲーション">
        {mainItems.map((item) => (
          <button
            type="button"
            key={item.page}
            className={current === item.page ? 'is-active' : ''}
            aria-current={current === item.page ? 'page' : undefined}
            onClick={() => navigate(item.page)}
          >
            <NavIcon name={item.icon} /><span>{item.label}</span>
          </button>
        ))}
        <button type="button" className={TOOL_LINKS.some((item) => item.page === current) ? 'is-active' : ''} aria-expanded={sheet === 'tools'} onClick={() => setSheet((value) => value === 'tools' ? null : 'tools')}>
          <NavIcon name="tools" /><span>ツール</span>
        </button>
        <button type="button" className={DATA_LINKS.some((item) => item.page === current) ? 'is-active' : ''} aria-expanded={sheet === 'more'} onClick={() => setSheet((value) => value === 'more' ? null : 'more')}>
          <NavIcon name="more" /><span>その他</span>
        </button>
      </nav>
    </>
  );
}
