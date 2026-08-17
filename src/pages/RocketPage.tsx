import { useMemo, useState } from 'react';
import { DatasetImage } from '../components/DatasetImage';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadRocketLineups } from '../services/scrapedDuck';
import type { RocketLineup, RocketPokemon } from '../types/scrapedDuck';
import { getTypeLabelJa } from '../utils/scrapedDuckLocalization';
import { rankCounterTypes } from '../utils/typeEffectiveness';
import '../styles/data-pages.css';

const ROCKET_GROUPS = [
  ['Team GO Rocket Boss', 'サカキ'],
  ['Team GO Rocket Leader', 'リーダー'],
  ['Team GO Rocket Grunt', 'したっぱ'],
] as const;

function RocketSlot({ number, pokemon }: { number: number; pokemon: RocketPokemon[] }) {
  return (
    <div className="rocket-slot">
      <h3>{number}匹目</h3>
      <div className="rocket-slot__candidates">
        {pokemon.length > 0 ? pokemon.map((candidate) => (
          <div className="rocket-pokemon" key={candidate.id}>
            <DatasetImage src={candidate.image} alt={candidate.displayName} />
            <div>
              <strong>{candidate.displayName}</strong>
              <div className="data-chip-list">
                {candidate.types.map((type) => <span className="data-chip data-chip--type" key={type}>{getTypeLabelJa(type)}</span>)}
                {candidate.isEncounter ? <span className="data-chip">ゲット可能</span> : null}
                {candidate.canBeShiny ? <span className="data-chip data-chip--shiny">色違いあり</span> : null}
              </div>
            </div>
          </div>
        )) : <span className="dataset-muted">情報なし</span>}
      </div>
    </div>
  );
}

function RocketCard({ lineup }: { lineup: RocketLineup }) {
  const allPokemon = [
    ...lineup.firstPokemon,
    ...lineup.secondPokemon,
    ...lineup.thirdPokemon,
  ];
  const counterTypes = rankCounterTypes(allPokemon.map((pokemon) => pokemon.types));

  return (
    <article className="dataset-card rocket-card">
      <header className="rocket-card__heading">
        <div>
          <span className="data-chip">{lineup.titleLabel}</span>
          <h2>{lineup.displayName}</h2>
        </div>
        {lineup.type ? <span className="data-chip data-chip--type">{getTypeLabelJa(lineup.type)}</span> : null}
      </header>
      {counterTypes.length > 0 ? (
        <div className="rocket-card__counter-types">
          <strong>おすすめ対策タイプ</strong>
          <div className="data-chip-list">
            {counterTypes.map((type) => <span className="data-chip data-chip--weakness" key={type.type}>{type.label}</span>)}
          </div>
          <small>ラインナップのタイプ相性から算出</small>
        </div>
      ) : null}
      <div className="rocket-lineup">
        <RocketSlot number={1} pokemon={lineup.firstPokemon} />
        <RocketSlot number={2} pokemon={lineup.secondPokemon} />
        <RocketSlot number={3} pokemon={lineup.thirdPokemon} />
      </div>
    </article>
  );
}

function lineupMatches(lineup: RocketLineup, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase('ja-JP');
  if (!normalized) return true;
  const pokemon = [
    ...lineup.firstPokemon,
    ...lineup.secondPokemon,
    ...lineup.thirdPokemon,
  ];
  return [
    lineup.name,
    lineup.displayName,
    lineup.title,
    lineup.titleLabel,
    lineup.type ?? '',
    lineup.type ? getTypeLabelJa(lineup.type) : '',
    ...pokemon.flatMap((candidate) => [candidate.name, candidate.displayName]),
  ].some((value) => value.toLocaleLowerCase('ja-JP').includes(normalized));
}

export function RocketPage() {
  const state = useCachedDataset(loadRocketLineups);
  const [query, setQuery] = useState('');
  const lineups = useMemo(
    () => (state.result?.data ?? []).filter((lineup) => lineupMatches(lineup, query)),
    [query, state.result],
  );
  const sections = useMemo(() => {
    const knownTitles = new Set(ROCKET_GROUPS.map(([title]) => title));
    const known = ROCKET_GROUPS.map(([title, label]) => ({
      title,
      label,
      entries: lineups.filter((lineup) => lineup.title === title),
    }));
    const other = lineups.filter((lineup) => !knownTitles.has(lineup.title as typeof ROCKET_GROUPS[number][0]));
    return other.length > 0
      ? [...known, { title: 'other', label: 'その他', entries: other }]
      : known;
  }, [lineups]);

  return (
    <div className="dataset-page rocket-page">
      <DatasetPageHeader
        eyebrow="現在のバトルラインナップ"
        title="GOロケット団"
        fetchedAt={state.result?.fetchedAt}
        refreshing={state.refreshing}
        onReload={() => void state.reload()}
      />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? <DatasetError onRetry={() => void state.reload()} /> : null}

      {state.result ? (
        <>
          <label className="dataset-search">
            <span>ラインナップを検索</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タイプ・役職・Pokémon名"
            />
          </label>
          <p className="dataset-page__scope-note">
            ScrapedDuckの現行データにはしたっぱのセリフが含まれないため、タイプ・役職・Pokémon名で検索できます。
          </p>
          <div className="dataset-sections" aria-busy={state.refreshing}>
            {sections.map((section) => section.entries.length > 0 ? (
              <section className="dataset-section" key={section.title}>
                <div className="dataset-section__heading"><h2>{section.label}</h2><span>{section.entries.length}件</span></div>
                <div className="rocket-cards">{section.entries.map((lineup) => <RocketCard lineup={lineup} key={lineup.id} />)}</div>
              </section>
            ) : null)}
            {lineups.length === 0 ? <p className="dataset-empty">該当するラインナップが見つかりません。</p> : null}
          </div>
        </>
      ) : null}
      <ScrapedDuckCredit />
    </div>
  );
}

export default RocketPage;
