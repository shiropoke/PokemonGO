import { useMemo, useState } from 'react';
import { FilterChips, type FilterChipOption } from '../components/FilterChips';
import { DatasetPageHeader } from '../components/DatasetPageHeader';
import {
  filterPokemonCenterStampRallyLocations,
  getPokemonCenterStampRallyStatus,
  POKEMON_CENTER_STAMP_RALLY_LOCATIONS,
  type PokemonCenterStampRallyRegion,
} from '../data/pokemonCenterStampRally';
import '../styles/data-pages.css';
import '../styles/pokemon-center-stamp-rally.css';

type RegionFilter = PokemonCenterStampRallyRegion | 'all';

const REGION_OPTIONS: readonly FilterChipOption<RegionFilter>[] = [
  { value: 'all', label: 'すべて' },
  { value: '北海道・東北', label: '北海道・東北' },
  { value: '関東', label: '関東' },
  { value: '中部・北陸', label: '中部・北陸' },
  { value: '関西', label: '関西' },
  { value: '中国・四国', label: '中国・四国' },
  { value: '九州・沖縄', label: '九州・沖縄' },
];

export function PokemonCenterStampRallyPage() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('all');
  const status = getPokemonCenterStampRallyStatus();
  const locations = useMemo(
    () => filterPokemonCenterStampRallyLocations(POKEMON_CENTER_STAMP_RALLY_LOCATIONS, query, region),
    [query, region],
  );

  return (
    <div className="dataset-page pokemon-center-stamp-page">
      <DatasetPageHeader title="ポケモンセンタースタンプラリー" />
      <p className="dataset-page__intro">
        全国のポケモンセンターとPokémon GO Lab.、合計18か所を巡る「ポケモンセンタースタンプラリー2026」の対象地点を確認できます。
      </p>

      <dl className="pokemon-center-stamp-summary" aria-label="スタンプラリー概要">
        <div><dt>対象</dt><dd>18か所</dd></div>
        <div><dt>ポケモンセンター</dt><dd>17店舗</dd></div>
        <div><dt>Pokémon GO Lab.</dt><dd>1か所</dd></div>
        <div><dt>開催期間</dt><dd>2026/7/1 ～ 2027/8/31</dd></div>
      </dl>

      <aside className="pokemon-center-stamp-campaign">
        <div><strong className={`pokemon-center-stamp-status pokemon-center-stamp-status--${status}`}>{status}</strong><span>認定証引換期間：2026/7/18 ～ 2027/9/30</span></div>
        <p>3か所以上で認定証、全18か所でコンプリート認定証を受け取れます。</p>
      </aside>

      <label className="dataset-search pokemon-center-stamp-search" htmlFor="pokemon-center-stamp-search">
        対象店舗を検索
        <input id="pokemon-center-stamp-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="店舗名・都道府県・市区町村・住所" />
      </label>
      <FilterChips<RegionFilter> ariaLabel="地方フィルター" className="pokemon-center-stamp-filters" options={REGION_OPTIONS} selected={region} onChange={setRegion} />

      <section className="pokemon-center-stamp-results" aria-live="polite">
        <div className="dataset-section__heading"><h2>{query ? '検索結果' : '対象店舗'}</h2><span>{locations.length}か所</span></div>
        {locations.length > 0 ? (
          <div className="pokemon-center-stamp-grid">
            {locations.map((location) => (
              <article className="dataset-card pokemon-center-stamp-card" key={location.id}>
                <div className="pokemon-center-stamp-card__body">
                  <div className="data-chip-list"><span className="data-chip">{location.region}</span>{location.isGoLab ? <span className="data-chip pokemon-center-stamp-card__lab">Pokémon GO Lab.</span> : null}</div>
                  <h3>{location.name}</h3>
                  <p className="pokemon-center-stamp-card__location">{location.prefecture} / {location.city}</p>
                  <p className="pokemon-center-stamp-card__address">{location.address}</p>
                  <div className="pokemon-center-stamp-card__actions">
                    <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer">Googleマップで開く</a>
                    <a href={location.officialUrl} target="_blank" rel="noopener noreferrer">公式ページで確認</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="dataset-empty">条件に一致する対象店舗はありません。</p>}
      </section>

      <section className="pokemon-center-stamp-guide"><h2>スタンプ取得方法</h2><ol><li>対象のポケモンセンターへ行く</li><li>対象ポケストップを回す</li><li>GOスタンプラリーのスタンプを押す</li><li>ロケーション背景付きピカチュウと出会う</li></ol></section>
      <aside className="pokemon-center-stamp-notice">営業時間や休業情報は変更される場合があります。訪問前に各店舗の公式ページをご確認ください。ポケモンストア、ポケモンカフェ、出張所、ポケモンセンターヨコハマ サテライトは対象外です。</aside>
      <footer className="dataset-credit"><span>公式情報: </span><a href="https://shop.pokemon.co.jp/ja/shop/common/events/202606/000336.html" target="_blank" rel="noopener noreferrer">キャンペーン情報</a><span> / </span><a href="https://shop.pokemon.co.jp/ja/" target="_blank" rel="noopener noreferrer">店舗一覧</a></footer>
    </div>
  );
}

export default PokemonCenterStampRallyPage;
