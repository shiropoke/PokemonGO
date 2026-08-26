import { useEffect, useMemo, useState } from 'react';
import { FavoriteButton } from '../components/FavoriteButton';
import { InternalLink } from '../components/InternalLink';
import { useFavorites } from '../contexts/FavoritesContext';
import { loadEvents } from '../services/events';
import { fetchPokemonData } from '../services/pokemonData';
import { loadEggs, loadResearch } from '../services/scrapedDuck';
import { loadRaidData } from '../services/raidData';
import type { ScrapedDuckEvent } from '../types/events';
import type { Pokemon } from '../types/pokemon';
import type { EggHatch, FieldResearchTask } from '../types/scrapedDuck';
import type { RaidBoss } from '../types/raids';
import type { NavigationQuery, Page } from '../types/navigation';
import { getEventTimingStatus } from '../utils/date';
import { eventTitleMentionsPokemon, externalPokemonMatches } from '../utils/pokemonMatching';

interface FavoriteDataState {
  pokemon: Pokemon[];
  events: ScrapedDuckEvent[];
  raids: RaidBoss[];
  eggs: EggHatch[];
  research: FieldResearchTask[];
  loading: boolean;
  error: boolean;
}

export function FavoritesPage({
  onNavigate,
}: {
  onNavigate(page: Page, query?: NavigationQuery): void;
}) {
  const { favorites } = useFavorites();
  const [state, setState] = useState<FavoriteDataState>({
    pokemon: [], events: [], raids: [], eggs: [], research: [], loading: true, error: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState((current) => ({ ...current, loading: true, error: false }));
    void Promise.allSettled([
      fetchPokemonData(), loadEvents(), loadRaidData(), loadEggs(), loadResearch(),
    ]).then(([pokemon, events, raids, eggs, research]) => {
      if (ignore) return;
      setState({
        pokemon: pokemon.status === 'fulfilled' ? pokemon.value.pokemon : [],
        events: events.status === 'fulfilled' ? events.value.events : [],
        raids: raids.status === 'fulfilled' ? raids.value.data : [],
        eggs: eggs.status === 'fulfilled' ? eggs.value.data : [],
        research: research.status === 'fulfilled' ? research.value.data : [],
        loading: false,
        error: pokemon.status === 'rejected',
      });
    });
    return () => { ignore = true; };
  }, [reloadKey]);

  const favoritePokemon = useMemo(() => {
    const byId = new Map(state.pokemon.map((entry) => [entry.speciesId, entry]));
    return favorites.map((id) => byId.get(id)).filter((entry): entry is Pokemon => Boolean(entry));
  }, [favorites, state.pokemon]);

  const relatedStatus = (pokemon: Pokemon): { label: string; page: Page }[] => {
    const statuses: { label: string; page: Page }[] = [];
    if (state.raids.some((entry) => externalPokemonMatches(entry.name, entry.speciesId, pokemon))) {
      statuses.push({ label: '現在レイド出現中', page: 'raids' });
    }
    if (state.events.some((event) => getEventTimingStatus(event, Date.now()) === 'ongoing' && eventTitleMentionsPokemon(event.name, pokemon))) {
      statuses.push({ label: '現在のイベント対象', page: 'events' });
    }
    const egg = state.eggs.find((entry) => externalPokemonMatches(entry.name, null, pokemon));
    if (egg) statuses.push({ label: `${egg.eggType}タマゴ`, page: 'eggs' });
    if (state.research.some((task) => task.rewards.some((reward) => externalPokemonMatches(reward.name, null, pokemon)))) {
      statuses.push({ label: 'フィールドリサーチ報酬', page: 'research' });
    }
    return statuses;
  };

  return (
    <div className="favorites-page">
      <header className="page-heading">
        <div>
          <h1>お気に入り</h1>
          <p>端末内に保存したポケモンと、現在関連する情報をまとめて確認できます。</p>
        </div>
      </header>

      {state.loading ? (
        <div className="dashboard-skeleton" aria-label="お気に入りを読み込み中" />
      ) : state.error && favorites.length > 0 ? (
        <div className="inline-error" role="alert">
          <p>お気に入りのポケモンデータを読み込めませんでした。</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>再試行</button>
        </div>
      ) : favoritePokemon.length === 0 ? (
        <div className="empty-panel">
          <h2>お気に入りはまだありません</h2>
          <p>個体値チェッカー、レイド、ランキングなどから追加できます。</p>
          <InternalLink className="primary-link" page="iv" onNavigate={onNavigate}>ポケモンを探す</InternalLink>
        </div>
      ) : (
        <div className="favorite-grid">
          {favoritePokemon.map((entry) => {
            const statuses = relatedStatus(entry);
            return (
              <article className="favorite-card" key={entry.speciesId}>
                <div>
                  <span>図鑑No. {entry.dex || '—'}</span>
                  <h2>{entry.displayName}</h2>
                  {statuses.length > 0 ? (
                    <ul className="favorite-card__status">
                      {statuses.map((status) => (
                        <li key={status.page}>
                          <InternalLink page={status.page} onNavigate={onNavigate}>{status.label}</InternalLink>
                        </li>
                      ))}
                    </ul>
                  ) : <p>現在一致するレイド・イベント・タマゴ・リサーチ情報はありません。</p>}
                </div>
                <div className="favorite-card__actions">
                  <InternalLink page="iv" query={{ species: entry.speciesId }} onNavigate={onNavigate}>個体値を調べる</InternalLink>
                  <FavoriteButton speciesId={entry.speciesId} displayName={entry.displayName} compact />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
