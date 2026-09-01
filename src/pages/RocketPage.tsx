import { useEffect, useMemo, useState } from 'react';
import { DatasetImage } from '../components/DatasetImage';
import { FilterChips } from '../components/FilterChips';
import {
  DatasetError,
  DatasetPageHeader,
  DatasetSkeleton,
  ScrapedDuckCredit,
  StaleDataNotice,
} from '../components/DatasetPageHeader';
import { RefreshButton } from '../components/RefreshButton';
import { TypeBadge } from '../components/TypeBadge';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadRocketLineups } from '../services/scrapedDuck';
import type { RocketLineup, RocketPokemon } from '../types/scrapedDuck';
import {
  buildRocketDialogueOptions,
  buildRocketTypeOptions,
  filterRocketLineups,
  ROCKET_DIALOGUE_ALL,
  ROCKET_TYPE_ALL,
  type RocketDialogueFilter,
  type RocketTypeFilter,
} from '../utils/rocketFilters';
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
                {candidate.types.map((type) => <TypeBadge key={type} type={type} variant="compact" />)}
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

export function RocketCard({ lineup }: { lineup: RocketLineup }) {
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
        {lineup.type ? <TypeBadge type={lineup.type} variant="compact" /> : null}
      </header>
      {lineup.dialogues.length > 0 ? (
        <section className="rocket-card__dialogues" aria-label={`${lineup.displayName}のセリフ`}>
          <strong>セリフ</strong>
          <div>
            {lineup.dialogues.map((dialogue) => (
              <blockquote key={dialogue}><q>{dialogue}</q></blockquote>
            ))}
          </div>
        </section>
      ) : null}
      {counterTypes.length > 0 ? (
        <div className="rocket-card__counter-types">
          <strong>おすすめ対策タイプ</strong>
          <div className="data-chip-list">
            {counterTypes.map((type) => <TypeBadge key={type.type} type={type.type} variant="compact" />)}
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

export function RocketPage() {
  const state = useCachedDataset(loadRocketLineups);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RocketTypeFilter>(ROCKET_TYPE_ALL);
  const [dialogueFilter, setDialogueFilter] = useState<RocketDialogueFilter>(ROCKET_DIALOGUE_ALL);
  const allLineups = state.result?.data ?? [];
  const typeOptions = useMemo(() => buildRocketTypeOptions(allLineups), [allLineups]);
  const dialogueOptions = useMemo(() => buildRocketDialogueOptions(allLineups), [allLineups]);
  const lineups = useMemo(
    () => filterRocketLineups(allLineups, {
      query,
      type: typeFilter,
      dialogue: dialogueFilter,
    }),
    [allLineups, dialogueFilter, query, typeFilter],
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

  useEffect(() => {
    if (!typeOptions.some((option) => option.value === typeFilter)) {
      setTypeFilter(ROCKET_TYPE_ALL);
    }
  }, [typeFilter, typeOptions]);

  useEffect(() => {
    if (dialogueFilter !== ROCKET_DIALOGUE_ALL && !dialogueOptions.includes(dialogueFilter)) {
      setDialogueFilter(ROCKET_DIALOGUE_ALL);
    }
  }, [dialogueFilter, dialogueOptions]);

  const hasFilters = query.length > 0
    || typeFilter !== ROCKET_TYPE_ALL
    || dialogueFilter !== ROCKET_DIALOGUE_ALL;
  const resetFilters = () => {
    setQuery('');
    setTypeFilter(ROCKET_TYPE_ALL);
    setDialogueFilter(ROCKET_DIALOGUE_ALL);
  };

  return (
    <div className="dataset-page rocket-page">
      <DatasetPageHeader title="GOロケット団" />

      {state.result?.stale ? <StaleDataNotice /> : null}
      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? (
        <DatasetError action={<RefreshButton loading={state.refreshing} label="再試行" onClick={state.refresh} />} />
      ) : null}

      {state.result ? (
        <>
          <label className="dataset-search">
            <span>ラインナップを検索</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タイプ・役職・ポケモン名・セリフ"
            />
          </label>
          <div className="rocket-page__filters">
            <FilterChips<RocketTypeFilter>
              ariaLabel="GOロケット団タイプフィルター"
              className="rocket-type-filters"
              options={typeOptions}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
            <label className="rocket-dialogue-filter">
              <span>セリフで絞り込み</span>
              <select
                value={dialogueFilter}
                onChange={(event) => setDialogueFilter(event.target.value)}
              >
                <option value={ROCKET_DIALOGUE_ALL}>すべてのセリフ</option>
                {dialogueOptions.map((dialogue) => (
                  <option value={dialogue} key={dialogue}>{dialogue}</option>
                ))}
              </select>
            </label>
            {hasFilters ? (
              <button className="dataset-filter-reset" type="button" onClick={resetFilters}>
                絞り込みを解除
              </button>
            ) : null}
          </div>
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
