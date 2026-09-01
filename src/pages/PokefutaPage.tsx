import { useMemo, useState } from 'react';
import { DatasetImage } from '../components/DatasetImage';
import { FilterChips, type FilterChipOption } from '../components/FilterChips';
import { PokefutaExportMenu } from '../components/PokefutaExportMenu';
import { PokefutaMap } from '../components/PokefutaMap';
import { RefreshButton } from '../components/RefreshButton';
import { DatasetPageHeader, DatasetSkeleton } from '../components/DatasetPageHeader';
import { useCachedDataset } from '../hooks/useCachedDataset';
import { loadPokefuta } from '../services/pokefuta';
import type { NavigationQuery, Page } from '../types/navigation';
import type { Pokefuta, PokefutaRegion } from '../types/pokefuta';
import {
  filterPokefuta,
  filterPokefutaPrefectures,
  getPokefutaPrefecture,
  type PokefutaRegionFilter,
} from '../utils/pokefuta';
import { normalizeSearchText } from '../utils/search';
import '../styles/data-pages.css';
import '../styles/pokefuta.css';

const REGION_OPTIONS: readonly FilterChipOption<PokefutaRegionFilter>[] = [
  { value: 'all', label: 'すべて' },
  { value: '北海道・東北', label: '北海道・東北' },
  { value: '関東', label: '関東' },
  { value: '中部', label: '中部' },
  { value: '近畿', label: '近畿' },
  { value: '中国・四国', label: '中国・四国' },
  { value: '九州・沖縄', label: '九州・沖縄' },
];

type NavigateHandler = (page: Page, query?: NavigationQuery) => void;

interface PokefutaPageProps {
  prefectureSlug: string | null;
  onNavigate: NavigateHandler;
}

function PokefutaCard({ lid }: { lid: Pokefuta }) {
  const pokemonLabel = lid.pokemonNames.join('・');
  return (
    <article className="dataset-card pokefuta-card">
      <DatasetImage
        src={lid.imageUrl}
        alt={`${lid.municipality}の${pokemonLabel}が描かれたポケふた`}
        className="pokefuta-card__image"
      />
      <div className="pokefuta-card__body">
        <div className="data-chip-list">
          <span className="data-chip">{lid.prefecture}</span>
          <span className="data-chip">{lid.region}</span>
        </div>
        <h2>{pokemonLabel}</h2>
        <p className="pokefuta-card__location">{lid.municipality}</p>
        <p className="pokefuta-card__address">{lid.address}</p>
        <div className="pokefuta-card__actions">
          {lid.mapUrl ? (
            <a href={lid.mapUrl} target="_blank" rel="noopener noreferrer">
              Googleマップで開く
            </a>
          ) : null}
          <a href={lid.officialUrl} target="_blank" rel="noopener noreferrer">
            公式ページで確認
          </a>
        </div>
      </div>
    </article>
  );
}

export function PokefutaPage({ prefectureSlug, onNavigate }: PokefutaPageProps) {
  const state = useCachedDataset(loadPokefuta);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<PokefutaRegionFilter>('all');
  const dataset = state.result?.data ?? null;
  const selectedPrefecture = getPokefutaPrefecture(dataset?.prefectures ?? [], prefectureSlug);
  const prefectureLids = useMemo(
    () => selectedPrefecture
      ? (dataset?.lids ?? []).filter((lid) => lid.prefectureSlug === selectedPrefecture.slug)
      : [],
    [dataset, selectedPrefecture],
  );
  const hasQuery = Boolean(normalizeSearchText(query));
  const visiblePrefectures = useMemo(
    () => filterPokefutaPrefectures(dataset?.prefectures ?? [], region),
    [dataset, region],
  );
  const matchingLids = useMemo(
    () => filterPokefuta(dataset?.lids ?? [], {
      query,
      region,
      prefectureSlug: null,
    }),
    [dataset, query, region],
  );
  const displayedLids = selectedPrefecture ? prefectureLids : matchingLids;
  const showLids = hasQuery || selectedPrefecture !== null;

  const selectPrefecture = (slug: string) => {
    onNavigate('pokefuta', slug ? { pref: slug } : undefined);
  };

  return (
    <div className="dataset-page pokefuta-page">
      <DatasetPageHeader title="ポケふた" />
      <p className="dataset-page__intro">
        日本全国のポケモンマンホール「ポケふた」を、都道府県・設置場所・描かれているポケモンから確認できます。
      </p>

      {state.loading && !state.result ? <DatasetSkeleton /> : null}
      {state.error && !state.result ? (
        <div className="dataset-error" role="alert">
          <p>ポケふた情報を読み込めませんでした</p>
          <RefreshButton loading={state.refreshing} label="再試行" onClick={state.refresh} />
        </div>
      ) : null}

      {dataset ? (
        <>
          {!selectedPrefecture ? (
            <>
              <dl className="pokefuta-summary" aria-label="ポケふた設置状況">
                <div><dt>全国</dt><dd>{dataset.summary.total}枚</dd></div>
                <div><dt>設置</dt><dd>{dataset.summary.installedPrefectures}都道府県</dd></div>
                <div><dt>未設置</dt><dd>{dataset.summary.uninstalledPrefectures}県</dd></div>
              </dl>

              <div className="pokefuta-controls">
                <label className="dataset-search pokefuta-search" htmlFor="pokefuta-search">
                  ポケふたを検索
                  <input
                    id="pokefuta-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ポケモン名・都道府県・市区町村・住所"
                  />
                </label>
                <label className="pokefuta-prefecture-select" htmlFor="pokefuta-prefecture">
                  都道府県
                  <select
                    id="pokefuta-prefecture"
                    value=""
                    onChange={(event) => selectPrefecture(event.target.value)}
                  >
                    <option value="">すべての都道府県</option>
                    {dataset.prefectures.map((prefecture) => (
                      <option value={prefecture.slug} key={prefecture.slug}>
                        {prefecture.name}（{prefecture.count}枚）
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <FilterChips<PokefutaRegionFilter>
                ariaLabel="地方フィルター"
                className="pokefuta-region-filters"
                options={REGION_OPTIONS}
                selected={region}
                onChange={setRegion}
              />
            </>
          ) : null}

          {showLids ? (
            <section className="pokefuta-results" aria-live="polite">
              <div className="dataset-section__heading pokefuta-results__heading">
                <h2>{selectedPrefecture?.name ?? '検索結果'}</h2>
                <span>
                  {selectedPrefecture
                    ? `ポケふた ${prefectureLids.length}枚`
                    : `${matchingLids.length}枚`}
                </span>
              </div>
              {selectedPrefecture ? (
                <div className="pokefuta-detail-actions">
                  <button
                    type="button"
                    className="pokefuta-back"
                    onClick={() => onNavigate('pokefuta')}
                  >
                    全国一覧へ戻る
                  </button>
                  {prefectureLids.length > 0 ? (
                    <PokefutaExportMenu
                      lids={prefectureLids}
                      prefectureName={selectedPrefecture.name}
                      prefectureSlug={selectedPrefecture.slug}
                    />
                  ) : null}
                </div>
              ) : null}
              {selectedPrefecture && prefectureLids.length > 0 ? (
                <PokefutaMap lids={prefectureLids} prefectureName={selectedPrefecture.name} />
              ) : null}
              {selectedPrefecture && prefectureLids.length > 0 ? (
                <div className="dataset-section__heading pokefuta-list-heading">
                  <h3>ポケふた一覧</h3>
                  <span>{prefectureLids.length}枚</span>
                </div>
              ) : null}
              {displayedLids.length > 0 ? (
                <div className="pokefuta-grid">
                  {displayedLids.map((lid) => <PokefutaCard lid={lid} key={lid.id} />)}
                </div>
              ) : (
                <p className="dataset-empty">
                  {selectedPrefecture && prefectureLids.length === 0
                    ? '現在、公式サイトではポケふたの設置を確認できません。'
                    : '条件に一致するポケふたはありません。'}
                </p>
              )}
            </section>
          ) : (
            <section className="pokefuta-prefectures" aria-live="polite">
              <div className="dataset-section__heading">
                <h2>都道府県から探す</h2>
                <span>{visiblePrefectures.length}都道府県</span>
              </div>
              <div className="pokefuta-prefecture-grid">
                {visiblePrefectures.map((prefecture) => (
                  <button
                    type="button"
                    className="pokefuta-prefecture-card"
                    onClick={() => selectPrefecture(prefecture.slug)}
                    key={prefecture.slug}
                  >
                    <span>{prefecture.region}</span>
                    <strong>{prefecture.name}</strong>
                    <small>{prefecture.count}枚</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          <aside className="pokefuta-notice">
            設置状況や設置場所は変更される場合があります。訪問前に公式情報をご確認ください。
          </aside>
          <footer className="dataset-credit">
            <span>Data provided by </span>
            <a href={dataset.source} target="_blank" rel="noopener noreferrer">
              ポケモンローカルActs「ポケふた」
            </a>
          </footer>
        </>
      ) : null}
    </div>
  );
}

export default PokefutaPage;
