import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FilterChips } from '../components/FilterChips';
import { TypeBadge } from '../components/TypeBadge';
import { TYPE_META } from '../constants/typeMeta';
import { fetchUnifiedMoveData, fetchUnifiedPokemonData } from '../services/unifiedGameData';
import type { NavigationQuery } from '../types/navigation';
import type { PokemonType } from '../types/gameData';
import type { UnifiedMove, UnifiedPokemon } from '../types/unifiedGameData';
import {
  buildPokedexEntries,
  findPokedexPokemonByKey,
  filterPokedexEntries,
  resolveEvolutionTarget,
  resolveMoves,
  type PokedexEntry,
  type PokedexSort,
} from '../utils/pokedex';
import '../styles/data-pages.css';
import '../styles/pokemon-pokedex.css';

const INITIAL_VISIBLE_COUNT = 60;
const TYPE_OPTIONS: readonly { value: PokemonType | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  ...Object.values(TYPE_META).map(({ key, labelJa }) => ({ value: key, label: labelJa })),
];

interface PokemonPokedexPageProps {
  selectedKey: string | null;
  onNavigate(page: 'pokemon', query?: NavigationQuery): void;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="data-chip">{children}</span>;
}

function PokedexCard({ entry, onOpen }: { entry: PokedexEntry; onOpen(key: string): void }) {
  const pokemon = entry.representative;
  return (
    <button className="pokedex-card dataset-card" type="button" onClick={() => onOpen(pokemon.key)}>
      <span className="pokedex-card__number">No. {String(entry.pokedexId).padStart(3, '0')}</span>
      <strong>{pokemon.names.ja}</strong>
      <span className="pokedex-card__english">{pokemon.names.en}</span>
      <div className="data-chip-list" aria-label="タイプ">
        {pokemon.types.map((type) => <TypeBadge type={type} variant="compact" key={type} />)}
      </div>
      <div className="data-chip-list">
        {pokemon.generation?.id ? <Badge>第{pokemon.generation.id}世代</Badge> : null}
        {entry.forms.length > 1 ? <Badge>{entry.forms.length}フォルム</Badge> : null}
        {pokemon.flags.shinyAvailable ? <span className="data-chip data-chip--shiny">色違い</span> : null}
        {pokemon.flags.shadowAvailable ? <span className="data-chip data-chip--shadow">シャドウ</span> : null}
      </div>
    </button>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="pokedex-detail__section"><h2>{title}</h2>{children}</section>;
}

function InfoList({ values }: { values: Array<[string, string | number | undefined]> }) {
  const visible = values.filter(([, value]) => value !== undefined);
  return visible.length ? <dl className="pokedex-info-list">{visible.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl> : null;
}

function MoveGroup({ title, moves }: { title: string; moves: UnifiedMove[] }) {
  if (moves.length === 0) return null;
  return <section className="pokedex-move-group"><h3>{title}</h3><ul>{moves.map((move) => (
    <li key={move.key}>
      <strong>{move.names.ja}</strong><TypeBadge type={move.type} variant="compact" />
      <span>{[move.pve?.power !== undefined ? `PvE 威力 ${move.pve.power}` : null, move.pve?.energyDelta !== undefined ? `エネルギー ${move.pve.energyDelta}` : null, move.pve?.durationMs !== undefined ? `${move.pve.durationMs}ms` : null].filter(Boolean).join(' / ')}</span>
      <span>{[move.pvp?.power !== undefined ? `PvP 威力 ${move.pvp.power}` : null, move.pvp?.energyDelta !== undefined ? `エネルギー ${move.pvp.energyDelta}` : null, move.pvp?.turns !== undefined ? `${move.pvp.turns}ターン` : null].filter(Boolean).join(' / ')}</span>
    </li>
  ))}</ul></section>;
}

function evolutionConditionLabels(pokemon: UnifiedPokemon['evolutions'][number]): string[] {
  const { conditions } = pokemon;
  return [
    conditions.candy !== undefined ? `アメ ${conditions.candy}` : null,
    conditions.item ? `アイテム: ${conditions.item}` : null,
    conditions.lure ? `ルアー: ${conditions.lure}` : null,
    conditions.buddyDistanceKm !== undefined ? `相棒距離 ${conditions.buddyDistanceKm}km` : null,
    conditions.mustBeBuddy ? '相棒にする' : null,
    conditions.timeOfDay === 'day' ? '昼' : conditions.timeOfDay === 'night' ? '夜' : null,
    conditions.gender ? `性別: ${conditions.gender}` : null,
    conditions.noCandyCostIfTraded ? '交換でアメ不要' : null,
  ].filter((value): value is string => Boolean(value));
}

function PokemonDetail({ pokemon, allPokemon, onNavigate }: {
  pokemon: UnifiedPokemon; allPokemon: readonly UnifiedPokemon[]; onNavigate: PokemonPokedexPageProps['onNavigate'];
}) {
  const [moves, setMoves] = useState<UnifiedMove[] | null>(null);
  const [movesFailed, setMovesFailed] = useState(false);
  const forms = allPokemon.filter((entry) => entry.pokedexId === pokemon.pokedexId);

  useEffect(() => {
    let cancelled = false;
    setMoves(null); setMovesFailed(false);
    void fetchUnifiedMoveData().then((dataset) => {
      if (!cancelled) setMoves(dataset.moves);
    }).catch(() => { if (!cancelled) setMovesFailed(true); });
    return () => { cancelled = true; };
  }, [pokemon.key]);

  const resolvedMoves = useMemo(() => moves ? {
    fast: resolveMoves(pokemon.moves.fast, moves), charged: resolveMoves(pokemon.moves.charged, moves),
    eliteFast: resolveMoves(pokemon.moves.eliteFast, moves), eliteCharged: resolveMoves(pokemon.moves.eliteCharged, moves),
  } : null, [moves, pokemon.moves]);
  const traits = [
    pokemon.flags.legendary ? '伝説' : null, pokemon.flags.mythic ? '幻' : null,
    pokemon.flags.ultraBeast ? 'ウルトラビースト' : null, pokemon.flags.shinyAvailable ? '色違い実装済み' : null,
    pokemon.flags.shadowAvailable ? 'シャドウ対応' : null, pokemon.eligibility?.tradable === true ? '交換可能' : null,
    pokemon.eligibility?.gymDefender === true ? 'ジム防衛可能' : null,
  ].filter((value): value is string => Boolean(value));
  const shinyMethods = pokemon.flags.shinyMethods ? Object.entries({ wild: '野生', raid: 'レイド', egg: 'タマゴ', research: 'リサーチ', evolution: '進化', photobomb: 'フォトボム' })
    .flatMap(([key, label]) => pokemon.flags.shinyMethods?.[key as keyof NonNullable<typeof pokemon.flags.shinyMethods>] ? [label] : []) : [];

  return <div className="pokedex-detail">
    <button className="pokedex-back" type="button" onClick={() => onNavigate('pokemon')}>← ポケモン図鑑へ戻る</button>
    <header className="page-heading"><div><p className="pokedex-card__number">No. {String(pokemon.pokedexId).padStart(3, '0')}</p><h1>{pokemon.names.ja}</h1><p>{pokemon.names.en} / {pokemon.form.nameJa ?? pokemon.form.nameEn}</p></div></header>
    {forms.length > 1 ? <label className="pokedex-form-select"><span>フォルム</span><select value={pokemon.key} onChange={(event) => onNavigate('pokemon', { key: event.target.value })}>{forms.map((form) => <option value={form.key} key={form.key}>{form.form.nameJa ?? form.form.nameEn}</option>)}</select></label> : null}
    <div className="data-chip-list">{pokemon.types.map((type) => <TypeBadge type={type} key={type} />)}</div>
    <DetailSection title="基本情報"><InfoList values={[["世代", pokemon.generation?.id ? `第${pokemon.generation.id}世代` : undefined], ['Form', pokemon.form.nameJa ?? pokemon.form.nameEn], ['最大CP', pokemon.maxCp], ['高さ', pokemon.size?.heightM !== undefined ? `${pokemon.size.heightM}m` : undefined], ['重さ', pokemon.size?.weightKg !== undefined ? `${pokemon.size.weightKg}kg` : undefined]]} /></DetailSection>
    {pokemon.stats ? <DetailSection title="種族値"><InfoList values={[["攻撃", pokemon.stats.attack], ['防御', pokemon.stats.defense], ['HP', pokemon.stats.stamina]]} /></DetailSection> : null}
    <DetailSection title="相棒・コスト"><InfoList values={[["相棒距離", pokemon.buddy?.candyDistanceKm !== undefined ? `${pokemon.buddy.candyDistanceKm}km` : undefined], ['技解放 ほしのすな', pokemon.secondMoveCost?.stardust], ['技解放 アメ', pokemon.secondMoveCost?.candy], ['リトレーン ほしのすな', pokemon.purificationCost?.stardust], ['リトレーン アメ', pokemon.purificationCost?.candy]]} /></DetailSection>
    {traits.length || shinyMethods.length ? <DetailSection title="特徴"><div className="data-chip-list">{traits.map((trait) => <Badge key={trait}>{trait}</Badge>)}{shinyMethods.map((method) => <Badge key={method}>色違い: {method}</Badge>)}</div></DetailSection> : null}
    <DetailSection title="わざ">{movesFailed ? <p className="dataset-muted">わざ情報を読み込めませんでした。</p> : !resolvedMoves ? <p className="dataset-muted">わざ情報を読み込んでいます。</p> : <div className="pokedex-moves"><MoveGroup title="通常技" moves={resolvedMoves.fast} /><MoveGroup title="ゲージ技" moves={resolvedMoves.charged} /><MoveGroup title="Elite通常技" moves={resolvedMoves.eliteFast} /><MoveGroup title="Eliteゲージ技" moves={resolvedMoves.eliteCharged} /></div>}</DetailSection>
    {pokemon.evolutions.length ? <DetailSection title="進化"><ul className="pokedex-evolutions">{pokemon.evolutions.map((evolution, index) => { const target = resolveEvolutionTarget(evolution.targetKey, allPokemon); const label = target?.names.ja ?? `図鑑番号 ${evolution.targetPokedexId}`; return <li key={`${evolution.targetKey ?? evolution.targetPokedexId}-${index}`}>{target?.key ? <button type="button" onClick={() => onNavigate('pokemon', { key: target.key })}>{label}</button> : <strong>{label}</strong>}<span>{evolutionConditionLabels(evolution).join(' / ')}</span></li>; })}</ul></DetailSection> : null}
  </div>;
}

export function PokemonPokedexPage({ selectedKey, onNavigate }: PokemonPokedexPageProps) {
  const [pokemon, setPokemon] = useState<UnifiedPokemon[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(''); const [type, setType] = useState<PokemonType | 'all'>('all');
  const [generation, setGeneration] = useState('all'); const [sort, setSort] = useState<PokedexSort>('dex-asc');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  useEffect(() => { let cancelled = false; void fetchUnifiedPokemonData().then((data) => { if (!cancelled) setPokemon(data.pokemon); }).catch(() => { if (!cancelled) setError(true); }); return () => { cancelled = true; }; }, []);
  const entries = useMemo(() => buildPokedexEntries(pokemon ?? []), [pokemon]);
  const filtered = useMemo(() => filterPokedexEntries(entries, { query, type, generation, sort }), [entries, generation, query, sort, type]);
  const generations = useMemo(() => [...new Set(entries.flatMap((entry) => entry.forms.map((form) => form.generation?.id).filter((id): id is number => id !== undefined)))].sort((a, b) => a - b), [entries]);
  useEffect(() => setVisibleCount(INITIAL_VISIBLE_COUNT), [query, type, generation, sort]);
  if (error) return <div className="dataset-page"><div className="dataset-error" role="alert">ポケモン図鑑を読み込めませんでした</div></div>;
  if (!pokemon) return <div className="dataset-page"><div className="dataset-skeleton" aria-label="図鑑を読み込んでいます"><span /><span /><span /></div></div>;
  const selected = findPokedexPokemonByKey(selectedKey, pokemon);
  if (selectedKey) return <div className="dataset-page">{selected ? <PokemonDetail pokemon={selected} allPokemon={pokemon} onNavigate={onNavigate} /> : <><div className="dataset-error" role="alert">ポケモンが見つかりませんでした</div><button className="pokedex-back" type="button" onClick={() => onNavigate('pokemon')}>ポケモン図鑑へ戻る</button></>}</div>;
  return <div className="dataset-page pokedex-page"><header className="page-heading"><div><h1>ポケモン図鑑</h1><p>Unified Pokémon Dataによるポケモン・フォーム情報です。</p></div></header><label className="dataset-search"><span>ポケモンを検索</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前・図鑑番号・フォーム" /></label><div className="pokedex-toolbar"><FilterChips<PokemonType | 'all'> ariaLabel="タイプで絞り込み" options={TYPE_OPTIONS} selected={type} onChange={setType} /><label><span>世代</span><select value={generation} onChange={(event) => setGeneration(event.target.value)}><option value="all">すべて</option>{generations.map((id) => <option value={String(id)} key={id}>第{id}世代</option>)}</select></label><label><span>並び順</span><select value={sort} onChange={(event) => setSort(event.target.value as PokedexSort)}><option value="dex-asc">図鑑番号順</option><option value="dex-desc">図鑑番号の降順</option><option value="name">名前順</option></select></label></div><p className="dataset-muted">{filtered.length.toLocaleString('ja-JP')}種</p>{filtered.length ? <div className="pokedex-grid">{filtered.slice(0, visibleCount).map((entry) => <PokedexCard entry={entry} onOpen={(key) => onNavigate('pokemon', { key })} key={entry.pokedexId} />)}</div> : <p className="dataset-empty">該当するポケモンが見つかりません。</p>}{visibleCount < filtered.length ? <button className="pokedex-more" type="button" onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}>さらに表示</button> : null}</div>;
}
