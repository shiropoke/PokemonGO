import { useEffect, useMemo, useRef, useState } from 'react';
import { HomeSectionOrderDialog } from '../components/HomeSectionOrderDialog';
import { useFavorites } from '../contexts/FavoritesContext';
import { loadEvents } from '../services/events';
import { fetchPokemonData } from '../services/pokemonData';
import { loadEggs, loadResearch } from '../services/scrapedDuck';
import { loadRaidData } from '../services/raidData';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { EggHatch, FieldResearchTask } from '../types/scrapedDuck';
import type { RaidBoss } from '../types/raids';
import { WeeklyEvents } from '../components/WeeklyEvents';
import { InternalLink } from '../components/InternalLink';
import type { NavigationQuery, Page } from '../types/navigation';
import {
  formatCountdown,
  formatEventDate,
  formatSiteUpdatedAt,
  groupAndSortEvents,
  parseEventDate,
} from '../utils/date';
import { getEventTypeLabel, localizeEventTitle } from '../utils/eventLocalization';
import { selectFeaturedEvent } from '../utils/featuredEvent';
import { createEmptyHomeDataUpdates, hasStaleHomeData, type HomeDataUpdates } from '../utils/homeDataUpdates';
import { eventTitleMentionsPokemon, externalPokemonMatches } from '../utils/pokemonMatching';
import { groupRaidsByTier } from '../utils/raidClassification';
import { getRaidTierLabel } from '../utils/scrapedDuckLocalization';
import { safeExternalUrl } from '../utils/url';
import {
  HOME_SECTION_IDS,
  resolveInitialHomeSectionOrder,
  saveHomeSectionOrder,
  type HomeSectionId,
  type HomeSectionOrder,
} from '../services/homeSectionOrder';

interface HomeDataState {
  events: ScrapedDuckEvent[];
  pokemon: Pokemon[];
  raids: RaidBoss[];
  eggs: EggHatch[];
  research: FieldResearchTask[];
  updates: HomeDataUpdates;
  loading: boolean;
  error: boolean;
}

type NavigateHandler = (page: Page, query?: NavigationQuery) => void;

function isSameLocalDay(date: Date | null, now: Date): boolean {
  return Boolean(
    date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate(),
  );
}

const LIMITED_EVENT_TYPES = new Set([
  'pokemon-spotlight-hour',
  'raid-hour',
  'max-mondays',
  'max-monday',
  'community-day',
  'community-day-classic',
  'research-day',
]);

const siteUpdatedAt = formatSiteUpdatedAt(import.meta.env.VITE_SITE_UPDATED_AT);

function HomeEventList({
  events,
  now,
  empty,
  limit = 3,
  onNavigate,
}: {
  events: readonly ScrapedDuckEvent[];
  now: number;
  empty: string;
  limit?: number;
  onNavigate: NavigateHandler;
}) {
  if (events.length === 0) return <p className="dashboard-empty">{empty}</p>;

  return (
    <div className="dashboard-list">
      {events.slice(0, limit).map((event) => {
        const start = parseEventDate(event.start);
        const future = start !== null && start.getTime() > now;
        const eventUrl = safeExternalUrl(event.link);
        const content = (
          <>
            <span className="dashboard-event__type">
              {getEventTypeLabel(event.eventType)}
            </span>
            <strong>{localizeEventTitle(event.name)}</strong>
            <span className="dashboard-event__time">
              {future && start
                ? formatCountdown(start.getTime(), now, '開始まで')
                : `${formatEventDate(event.start)}〜${formatEventDate(event.end)}`}
            </span>
          </>
        );
        return eventUrl ? (
          <a
            className="dashboard-event"
            href={eventUrl}
            target="_blank"
            rel="noreferrer"
            key={event.eventID}
          >
            {content}
          </a>
        ) : (
          <InternalLink
            className="dashboard-event"
            page="events"
            onNavigate={onNavigate}
            key={event.eventID}
          >
            {content}
          </InternalLink>
        );
      })}
    </div>
  );
}

function FeaturedEvent({
  event,
  now,
  onNavigate,
}: {
  event: ScrapedDuckEvent | null;
  now: number;
  onNavigate: NavigateHandler;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!event) {
    return (
      <div className="home-featured-event home-featured-event--empty">
        <p>現在ご案内できるイベントはありません。</p>
      </div>
    );
  }

  const start = parseEventDate(event.start)?.getTime();
  const end = parseEventDate(event.end)?.getTime();
  const eventUrl = safeExternalUrl(event.link);
  const countdown =
    start !== undefined && start > now
      ? formatCountdown(start, now, '開始まで')
      : end !== undefined && end > now
        ? formatCountdown(end, now, '終了まで')
        : `${formatEventDate(event.start)}〜${formatEventDate(event.end)}`;

  const content = (
    <>
      {event.image && !imageFailed ? (
        <img
          src={event.image}
          alt=""
          loading="eager"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <span className="home-featured-event__shade" aria-hidden="true" />
      <span className="home-featured-event__content">
        <span className="home-featured-event__badge">
          {getEventTypeLabel(event.eventType)}
        </span>
        <strong>{localizeEventTitle(event.name)}</strong>
        <small>{countdown}</small>
      </span>
    </>
  );

  return eventUrl ? (
    <a
      className="home-featured-event"
      href={eventUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <InternalLink
      className="home-featured-event"
      page="events"
      onNavigate={onNavigate}
    >
      {content}
    </InternalLink>
  );
}

export function HomePage({ onNavigate }: { onNavigate: NavigateHandler }) {
  const { favorites } = useFavorites();
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const [sectionOrder, setSectionOrder] = useState<HomeSectionOrder>(() => {
    try { return resolveInitialHomeSectionOrder(window.localStorage); } catch { return HOME_SECTION_IDS; }
  });
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<HomeDataState>({
    events: [],
    pokemon: [],
    raids: [],
    eggs: [],
    research: [],
    updates: createEmptyHomeDataUpdates(),
    loading: true,
    error: false,
  });

  useEffect(() => {
    let ignore = false;
    setState((current) => ({ ...current, loading: true, error: false }));
    void Promise.allSettled([
      loadEvents(),
      fetchPokemonData(),
      loadRaidData(),
      loadEggs(),
      loadResearch(),
    ]).then((results) => {
      if (ignore) return;
      const eventsResult = results[0];
      const pokemonResult = results[1];
      const raidsResult = results[2];
      const eggsResult = results[3];
      const researchResult = results[4];
      setState({
        events: eventsResult.status === 'fulfilled' ? eventsResult.value.events : [],
        pokemon:
          pokemonResult.status === 'fulfilled' ? pokemonResult.value.pokemon : [],
        raids: raidsResult.status === 'fulfilled' ? raidsResult.value.data : [],
        eggs: eggsResult.status === 'fulfilled' ? eggsResult.value.data : [],
        research:
          researchResult.status === 'fulfilled' ? researchResult.value.data : [],
        updates: {
          events: eventsResult.status === 'fulfilled'
            ? {
                fetchedAt: eventsResult.value.fetchedAt,
                stale: eventsResult.value.stale,
              }
            : { fetchedAt: null, stale: false },
          raids: raidsResult.status === 'fulfilled'
            ? {
                fetchedAt: raidsResult.value.fetchedAt,
                stale: raidsResult.value.stale,
              }
            : { fetchedAt: null, stale: false },
          eggs: eggsResult.status === 'fulfilled'
            ? {
                fetchedAt: eggsResult.value.fetchedAt,
                stale: eggsResult.value.stale,
              }
            : { fetchedAt: null, stale: false },
          research: researchResult.status === 'fulfilled'
            ? {
                fetchedAt: researchResult.value.fetchedAt,
                stale: researchResult.value.stale,
              }
            : { fetchedAt: null, stale: false },
        },
        loading: false,
        error: [eventsResult, raidsResult, eggsResult, researchResult].every(
          (result) => result.status === 'rejected',
        ),
      });
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = useMemo(() => new Date(now), [now]);
  const groups = useMemo(
    () => groupAndSortEvents(state.events, now),
    [now, state.events],
  );
  const startsToday = useMemo(
    () =>
      state.events
        .filter((event) => isSameLocalDay(parseEventDate(event.start), today))
        .sort(
          (a, b) =>
            (parseEventDate(a.start)?.getTime() ?? Infinity) -
            (parseEventDate(b.start)?.getTime() ?? Infinity),
        ),
    [state.events, today],
  );
  const endsToday = useMemo(
    () =>
      state.events
        .filter((event) => isSameLocalDay(parseEventDate(event.end), today))
        .sort(
          (a, b) =>
            (parseEventDate(a.end)?.getTime() ?? Infinity) -
            (parseEventDate(b.end)?.getTime() ?? Infinity),
        ),
    [state.events, today],
  );
  const limitedToday = useMemo(
    () => startsToday.filter((event) => LIMITED_EVENT_TYPES.has(event.eventType)),
    [startsToday],
  );
  const featuredEvent = useMemo(
    () => selectFeaturedEvent(state.events, now),
    [now, state.events],
  );
  const hasStaleData = useMemo(
    () => hasStaleHomeData(state.updates),
    [state.updates],
  );
  const featuredRaids = useMemo(
    () => {
      const tierGroups = groupRaidsByTier(state.raids);
      return [
        ...tierGroups.flatMap((group) => group.raids.slice(0, 1)),
        ...tierGroups.flatMap((group) => group.raids.slice(1)),
      ].slice(0, 6);
    },
    [state.raids],
  );
  const favoriteEventMatches = useMemo(() => {
    if (favorites.length === 0) return [];
    const favoritePokemon = state.pokemon.filter((pokemon) =>
      favorites.includes(pokemon.speciesId),
    );
    return groups.ongoing.filter((event) =>
      favoritePokemon.some((pokemon) => eventTitleMentionsPokemon(event.name, pokemon)),
    );
  }, [favorites, groups.ongoing, state.pokemon]);
  const favoriteInsights = useMemo(() => {
    if (favorites.length === 0) return [];
    const favoritePokemon = state.pokemon.filter((pokemon) =>
      favorites.includes(pokemon.speciesId),
    );
    const insights: { key: string; name: string; detail: string; page: Page }[] = [];
    for (const pokemon of favoritePokemon) {
      const raid = state.raids.find(
        (entry) => externalPokemonMatches(entry.name, entry.speciesId, pokemon),
      );
      if (raid) insights.push({ key: `${pokemon.speciesId}-raid`, name: pokemon.displayName, detail: `${getRaidTierLabel(raid.tier)}に出現中`, page: 'raids' });
      const egg = state.eggs.find((entry) => externalPokemonMatches(entry.name, null, pokemon));
      if (egg) insights.push({ key: `${pokemon.speciesId}-egg`, name: pokemon.displayName, detail: `${egg.eggType}タマゴから孵化`, page: 'eggs' });
      const research = state.research.find((task) =>
        task.rewards.some((reward) => externalPokemonMatches(reward.name, null, pokemon)),
      );
      if (research) insights.push({ key: `${pokemon.speciesId}-research`, name: pokemon.displayName, detail: 'フィールドリサーチ報酬', page: 'research' });
    }
    return insights.slice(0, 6);
  }, [favorites, state.eggs, state.pokemon, state.raids, state.research]);

  const closeOrderDialog = () => {
    setIsOrderDialogOpen(false);
    window.requestAnimationFrame(() => editButtonRef.current?.focus({ preventScroll: true }));
  };

  const saveSectionOrder = (nextOrder: HomeSectionOrder) => {
    setSectionOrder(nextOrder);
    try { saveHomeSectionOrder(nextOrder, window.localStorage); } catch { saveHomeSectionOrder(nextOrder); }
    closeOrderDialog();
  };

  const renderHomeSection = (id: HomeSectionId) => {
    switch (id) {
      case 'featured': return <section className="dashboard-card dashboard-card--wide"><div className="section-heading-row"><h2>注目イベント</h2><InternalLink page="events" onNavigate={onNavigate}>すべて見る</InternalLink></div><FeaturedEvent key={featuredEvent?.eventID ?? 'empty'} event={featuredEvent} now={now} onNavigate={onNavigate} /></section>;
      case 'limited-today': return <section className="dashboard-card dashboard-card--wide"><h2>今日の時間限定イベント</h2><HomeEventList events={limitedToday} now={now} empty="今日の時間限定イベントはありません。" onNavigate={onNavigate} /><div className="home-today-details"><details><summary>今日開始するイベント <span>{startsToday.length}件</span></summary><HomeEventList events={startsToday} now={now} empty="今日開始するイベントはありません。" onNavigate={onNavigate} /></details><details><summary>今日終了するイベント <span>{endsToday.length}件</span></summary><HomeEventList events={endsToday} now={now} empty="今日終了するイベントはありません。" onNavigate={onNavigate} /></details></div></section>;
      case 'ongoing': return <section className="dashboard-card dashboard-card--wide"><div className="section-heading-row"><h2>開催中のイベント</h2><InternalLink page="events" onNavigate={onNavigate}>すべて見る</InternalLink></div><HomeEventList events={groups.ongoing} now={now} empty="現在開催中のイベントはありません。" limit={4} onNavigate={onNavigate} /></section>;
      case 'weekly': return <section className="dashboard-card dashboard-card--wide"><div className="section-heading-row"><h2>週間イベント</h2><InternalLink page="events" onNavigate={onNavigate}>イベント一覧</InternalLink></div><WeeklyEvents events={state.events} now={now} /></section>;
      case 'raids': return <section className="dashboard-card dashboard-card--wide"><div className="section-heading-row"><h2>現在のレイド</h2><InternalLink page="raids" onNavigate={onNavigate}>すべて見る</InternalLink></div>{state.raids.length === 0 ? <p className="dashboard-empty">現在のレイド情報を取得できませんでした。</p> : <div className="dashboard-raid-list">{featuredRaids.map((raid) => <InternalLink page="raids" onNavigate={onNavigate} className="dashboard-raid" key={raid.id}>{raid.image ? <img src={raid.image} alt="" loading="lazy" /> : <span className="dashboard-raid__placeholder" aria-hidden="true" />}<span><strong>{raid.displayName}</strong><small>{getRaidTierLabel(raid.tier)}{raid.isShadow ? <span className="dashboard-raid__shadow">シャドウ</span> : null}</small></span></InternalLink>)}</div>}</section>;
      case 'favorites': return <section className="dashboard-card dashboard-card--wide"><div className="section-heading-row"><h2>お気に入り情報</h2><InternalLink page="favorites" onNavigate={onNavigate}>お気に入りを管理</InternalLink></div>{favorites.length === 0 ? <p className="dashboard-empty">ポケモンをお気に入りに追加すると、開催中情報をここで確認できます。</p> : <>{favoriteInsights.length > 0 ? <div className="favorite-insight-list">{favoriteInsights.map((insight) => <InternalLink page={insight.page} onNavigate={onNavigate} key={insight.key}><strong>{insight.name}</strong><span>{insight.detail}</span></InternalLink>)}</div> : null}{favoriteEventMatches.length > 0 || favoriteInsights.length === 0 ? <HomeEventList events={favoriteEventMatches} now={now} empty="現在のレイド・イベント・タマゴ・リサーチに一致するお気に入りはありません。" onNavigate={onNavigate} /> : null}</>}</section>;
    }
  };

  return (
    <div className="home-page">
      <header className="page-heading dashboard-heading home-hero-heading">
        <div className="home-hero-heading__meta">
          <time dateTime={today.toISOString()}>{new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }).format(today)}</time>
          {siteUpdatedAt ? <span className="home-site-updated">最終更新 {siteUpdatedAt}</span> : null}
        </div>
        <div className="home-hero-heading__copy">
          <h1>ホーム</h1>
          <p>最新のイベントやレイド情報をチェックしよう！</p>
        </div>
      </header>

      {hasStaleData ? <p className="data-notice">一部の保存済みデータを表示しています。</p> : null}
      {state.loading ? (
        <div className="dashboard-skeleton" aria-label="今日の情報を読み込み中" />
      ) : state.error && state.events.length === 0 ? (
        <div className="inline-error" role="alert">
          <p>今日の情報を取得できませんでした</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>再試行</button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {sectionOrder.map((id) => renderHomeSection(id))}
          <div className="home-section-order-edit">
            <button ref={editButtonRef} type="button" onClick={() => setIsOrderDialogOpen(true)}>
              ホームを編集
            </button>
          </div>
        </div>
      )}
      {isOrderDialogOpen ? <HomeSectionOrderDialog order={sectionOrder} onCancel={closeOrderDialog} onSave={saveSectionOrder} /> : null}
    </div>
  );
}
