import { useEffect, useMemo, useState } from 'react';
import { useFavorites } from '../contexts/FavoritesContext';
import { loadEvents } from '../services/events';
import { fetchPokemonData } from '../services/pokemonData';
import { loadEggs, loadRaids, loadResearch } from '../services/scrapedDuck';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { EggHatch, FieldResearchTask, RaidBoss } from '../types/scrapedDuck';
import { WeeklyEvents } from '../components/WeeklyEvents';
import {
  formatCountdown,
  formatEventDate,
  formatLastUpdated,
  groupAndSortEvents,
  parseEventDate,
} from '../utils/date';
import { getEventTypeLabel, localizeEventTitle } from '../utils/eventLocalization';
import { eventTitleMentionsPokemon, externalPokemonMatches } from '../utils/pokemonMatching';
import { groupRaidsByTier } from '../utils/raidClassification';
import { getRaidTierLabel } from '../utils/scrapedDuckLocalization';
import { safeExternalUrl } from '../utils/url';
import { getWeeklyEvents } from '../utils/weeklyEvents';

interface HomeDataState {
  events: ScrapedDuckEvent[];
  pokemon: Pokemon[];
  raids: RaidBoss[];
  eggs: EggHatch[];
  research: FieldResearchTask[];
  fetchedAt: number | null;
  stale: boolean;
  loading: boolean;
  error: boolean;
}

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

function HomeEventList({
  events,
  now,
  empty,
  limit = 3,
}: {
  events: readonly ScrapedDuckEvent[];
  now: number;
  empty: string;
  limit?: number;
}) {
  if (events.length === 0) return <p className="dashboard-empty">{empty}</p>;

  return (
    <div className="dashboard-list">
      {events.slice(0, limit).map((event) => {
        const start = parseEventDate(event.start);
        const future = start !== null && start.getTime() > now;
        const eventUrl = safeExternalUrl(event.link);
        return (
          <a
            className="dashboard-event"
            href={eventUrl ?? '#/events'}
            target={eventUrl ? '_blank' : undefined}
            rel={eventUrl ? 'noreferrer' : undefined}
            key={event.eventID}
          >
            <span className="dashboard-event__type">
              {getEventTypeLabel(event.eventType)}
            </span>
            <strong>{localizeEventTitle(event.name)}</strong>
            <span className="dashboard-event__time">
              {future && start
                ? formatCountdown(start.getTime(), now, '開始まで')
                : `${formatEventDate(event.start)}〜${formatEventDate(event.end)}`}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function FeaturedEvent({
  event,
  now,
}: {
  event: ScrapedDuckEvent | null;
  now: number;
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

  return (
    <a
      className="home-featured-event"
      href={eventUrl ?? '#/events'}
      target={eventUrl ? '_blank' : undefined}
      rel={eventUrl ? 'noreferrer' : undefined}
    >
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
    </a>
  );
}

export function HomePage() {
  const { favorites } = useFavorites();
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<HomeDataState>({
    events: [],
    pokemon: [],
    raids: [],
    eggs: [],
    research: [],
    fetchedAt: null,
    stale: false,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let ignore = false;
    setState((current) => ({ ...current, loading: true, error: false }));
    void Promise.allSettled([
      loadEvents(),
      fetchPokemonData(),
      loadRaids(),
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
        fetchedAt:
          eventsResult.status === 'fulfilled' ? eventsResult.value.fetchedAt : null,
        stale:
          eventsResult.status === 'fulfilled' ? eventsResult.value.stale : false,
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
  const featuredEvent = groups.ongoing[0] ?? groups.upcoming[0] ?? null;
  const weeklyEvents = useMemo(
    () => getWeeklyEvents(state.events, now),
    [now, state.events],
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
    const insights: { key: string; name: string; detail: string; href: string }[] = [];
    for (const pokemon of favoritePokemon) {
      const raid = state.raids.find(
        (entry) => externalPokemonMatches(entry.name, entry.speciesId, pokemon),
      );
      if (raid) insights.push({ key: `${pokemon.speciesId}-raid`, name: pokemon.displayName, detail: `${getRaidTierLabel(raid.tier)}に出現中`, href: '#/raids' });
      const egg = state.eggs.find((entry) => externalPokemonMatches(entry.name, null, pokemon));
      if (egg) insights.push({ key: `${pokemon.speciesId}-egg`, name: pokemon.displayName, detail: `${egg.eggType}タマゴから孵化`, href: '#/eggs' });
      const research = state.research.find((task) =>
        task.rewards.some((reward) => externalPokemonMatches(reward.name, null, pokemon)),
      );
      if (research) insights.push({ key: `${pokemon.speciesId}-research`, name: pokemon.displayName, detail: 'フィールドリサーチ報酬', href: '#/research' });
    }
    return insights.slice(0, 6);
  }, [favorites, state.eggs, state.pokemon, state.raids, state.research]);

  return (
    <div className="home-page">
      <header className="page-heading dashboard-heading home-hero-heading">
        <div>
          <h1>ホーム</h1>
          <p>最新のイベントやレイド情報をチェックしよう！</p>
          <time dateTime={today.toISOString()}>{new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }).format(today)}</time>
        </div>
        {state.fetchedAt ? (
          <span className="dashboard-updated">最終更新 {formatLastUpdated(state.fetchedAt)}</span>
        ) : null}
      </header>

      {state.stale ? <p className="data-notice">保存済みデータを表示しています。</p> : null}
      {state.loading ? (
        <div className="dashboard-skeleton" aria-label="今日の情報を読み込み中" />
      ) : state.error && state.events.length === 0 ? (
        <div className="inline-error" role="alert">
          <p>今日の情報を取得できませんでした</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>再試行</button>
        </div>
      ) : (
        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-card--wide">
            <div className="section-heading-row">
              <h2>注目イベント</h2>
              <a href="#/events">すべて見る</a>
            </div>
            <FeaturedEvent key={featuredEvent?.eventID ?? 'empty'} event={featuredEvent} now={now} />
          </section>

          <section className="dashboard-card dashboard-card--wide">
            <h2>今日の時間限定イベント</h2>
            <HomeEventList events={limitedToday} now={now} empty="今日の時間限定イベントはありません。" />
            <div className="home-today-details">
              <details>
                <summary>今日開始するイベント <span>{startsToday.length}件</span></summary>
                <HomeEventList events={startsToday} now={now} empty="今日開始するイベントはありません。" />
              </details>
              <details>
                <summary>今日終了するイベント <span>{endsToday.length}件</span></summary>
                <HomeEventList events={endsToday} now={now} empty="今日終了するイベントはありません。" />
              </details>
            </div>
          </section>

          <section className="dashboard-card dashboard-card--wide">
            <div className="section-heading-row">
              <h2>開催中のイベント</h2>
              <a href="#/events">すべて見る</a>
            </div>
            <HomeEventList events={groups.ongoing} now={now} empty="現在開催中のイベントはありません。" limit={4} />
          </section>

          <section className="dashboard-card dashboard-card--wide">
            <div className="section-heading-row">
              <h2>今週のイベント</h2>
              <a href="#/events">イベント一覧</a>
            </div>
            <WeeklyEvents events={weeklyEvents} now={now} />
          </section>

          <section className="dashboard-card dashboard-card--wide">
            <div className="section-heading-row">
              <h2>現在のレイド</h2>
              <a href="#/raids">すべて見る</a>
            </div>
            {state.raids.length === 0 ? (
              <p className="dashboard-empty">現在のレイド情報を取得できませんでした。</p>
            ) : (
              <div className="dashboard-raid-list">
                {featuredRaids.map((raid) => (
                  <a href="#/raids" className="dashboard-raid" key={raid.id}>
                    {raid.image ? <img src={raid.image} alt="" loading="lazy" /> : <span className="dashboard-raid__placeholder" aria-hidden="true" />}
                    <span>
                      <strong>{raid.displayName}</strong>
                      <small>
                        {getRaidTierLabel(raid.tier)}
                        {raid.isShadow ? <span className="dashboard-raid__shadow">シャドウ</span> : null}
                      </small>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-card dashboard-card--wide">
            <div className="section-heading-row">
              <h2>お気に入り情報</h2>
              <a href="#/favorites">お気に入りを管理</a>
            </div>
            {favorites.length === 0 ? (
              <p className="dashboard-empty">Pokémonをお気に入りに追加すると、開催中情報をここで確認できます。</p>
            ) : (
              <>
                {favoriteInsights.length > 0 ? (
                  <div className="favorite-insight-list">
                    {favoriteInsights.map((insight) => (
                      <a href={insight.href} key={insight.key}><strong>{insight.name}</strong><span>{insight.detail}</span></a>
                    ))}
                  </div>
                ) : null}
                {favoriteEventMatches.length > 0 || favoriteInsights.length === 0 ? (
                  <HomeEventList events={favoriteEventMatches} now={now} empty="現在のレイド・イベント・タマゴ・リサーチに一致するお気に入りはありません。" />
                ) : null}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
