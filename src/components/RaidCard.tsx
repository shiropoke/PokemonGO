import type { RaidBoss } from '../types/raids';
import { getRaidTierLabel } from '../utils/scrapedDuckLocalization';
import { getTypeWeaknesses } from '../utils/typeEffectiveness';
import { getWeatherDisplay } from '../utils/weather';
import { DatasetImage } from './DatasetImage';
import { FavoriteButton } from './FavoriteButton';
import { RaidCountersPanel } from './RaidCountersPanel';
import { TypeBadge } from './TypeBadge';

function formatCost(cost: { stardust?: number; candy?: number }): string {
  return [
    cost.stardust !== undefined ? `${cost.stardust.toLocaleString('ja-JP')} ほしのすな` : null,
    cost.candy !== undefined ? `${cost.candy} アメ` : null,
  ].filter((value): value is string => Boolean(value)).join(' / ');
}

export function RaidCard({ raid }: { raid: RaidBoss }) {
  const weaknesses = getTypeWeaknesses(raid.types);
  const details = raid.pokemonDetails;
  const hasPokemonDetails = Boolean(details && (
    raid.pokedexId
    || details.stats
    || details.maxCp !== undefined
    || details.moves
    || details.evolutions?.length
  ));

  return (
    <article className="dataset-card raid-card">
      <div className="raid-card__summary">
        <DatasetImage src={raid.image} alt={raid.displayName} />
        <div className="raid-card__title">
          <span className="data-chip">{getRaidTierLabel(raid.tier)}</span>
          {raid.isShadow ? <span className="data-chip data-chip--shadow">シャドウ</span> : null}
          {raid.canBeShiny ? <span className="data-chip data-chip--shiny">色違いあり</span> : null}
          <h3>{raid.displayName}</h3>
          {raid.speciesId ? (
            <div className="raid-card__favorite">
              <FavoriteButton
                speciesId={raid.speciesId}
                displayName={raid.displayName}
                compact
              />
            </div>
          ) : null}
          {raid.types.length > 0 ? (
            <div className="data-chip-list" aria-label="タイプ">
              {raid.types.map((type) => (
                <TypeBadge key={type} type={type} variant="compact" />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {weaknesses.length > 0 ? (
        <div className="raid-card__weaknesses">
          <strong>弱点</strong>
          <div className="data-chip-list">
            {weaknesses.map((weakness) => (
              <TypeBadge key={weakness.type} type={weakness.type} variant="compact">
                {weakness.multiplier > 2 ? `×${weakness.multiplier.toFixed(2)}` : null}
              </TypeBadge>
            ))}
          </div>
        </div>
      ) : null}

      {raid.combatPower?.normal ? (
        <dl className="dataset-stats">
          <div>
            <dt>捕獲時CP</dt>
            <dd>{raid.combatPower.normal.min}～{raid.combatPower.normal.max}</dd>
          </div>
          {raid.combatPower.boosted ? (
            <div>
              <dt>天候ブーストCP</dt>
              <dd className="raid-card__boosted-cp">
                <span>{raid.combatPower.boosted.min}～{raid.combatPower.boosted.max}</span>
                {raid.boostedWeather.length > 0 ? (
                  <span className="raid-card__boosted-weather" aria-label="ブースト天候">
                    {raid.boostedWeather.map((weather, index) => {
                      const display = getWeatherDisplay(weather);

                      return (
                        <span className="raid-card__weather" key={`${weather}-${index}`}>
                          {display.icon ? (
                            <img src={display.icon} alt="" aria-hidden="true" width="22" height="22" />
                          ) : null}
                          <span>{display.label}</span>
                        </span>
                      );
                    })}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {hasPokemonDetails && details ? (
        <details className="raid-card__details raid-card__pokemon-details">
          <summary>ポケモン詳細</summary>
          <div className="raid-card__details-content">
            <section>
              <h4>基本情報</h4>
              <dl className="dataset-stats">
                {raid.pokedexId ? <div><dt>図鑑番号</dt><dd>No. {raid.pokedexId}</dd></div> : null}
                {details.form ? <div><dt>Form</dt><dd>{details.form}</dd></div> : null}
                {details.maxCp !== undefined ? <div><dt>最大CP</dt><dd>{details.maxCp.toLocaleString('ja-JP')}</dd></div> : null}
                {details.buddyDistanceKm !== undefined ? <div><dt>相棒距離</dt><dd>{details.buddyDistanceKm} km</dd></div> : null}
                {details.size?.heightM !== undefined ? <div><dt>高さ</dt><dd>{details.size.heightM} m</dd></div> : null}
                {details.size?.weightKg !== undefined ? <div><dt>重さ</dt><dd>{details.size.weightKg} kg</dd></div> : null}
              </dl>
            </section>

            {details.stats ? (
              <section>
                <h4>種族値</h4>
                <dl className="dataset-stats dataset-stats--three">
                  <div><dt>攻撃</dt><dd>{details.stats.attack}</dd></div>
                  <div><dt>防御</dt><dd>{details.stats.defense}</dd></div>
                  <div><dt>HP</dt><dd>{details.stats.stamina}</dd></div>
                </dl>
              </section>
            ) : null}

            {details.secondMoveCost || (raid.isShadow && details.purificationCost) ? (
              <section>
                <h4>コスト</h4>
                <dl className="dataset-stats">
                  {details.secondMoveCost ? (
                    <div><dt>技解放</dt><dd>{formatCost(details.secondMoveCost)}</dd></div>
                  ) : null}
                  {raid.isShadow && details.purificationCost ? (
                    <div><dt>リトレーン</dt><dd>{formatCost(details.purificationCost)}</dd></div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {details.moves ? (
              <section className="raid-card__moves">
                <h4>技</h4>
                {details.moves.fast.length > 0 ? <p><strong>通常技</strong><span>{details.moves.fast.join('・')}</span></p> : null}
                {details.moves.charged.length > 0 ? <p><strong>ゲージ技</strong><span>{details.moves.charged.join('・')}</span></p> : null}
                {details.moves.eliteFast.length > 0 ? <p><strong>Elite通常技</strong><span>{details.moves.eliteFast.join('・')}</span></p> : null}
                {details.moves.eliteCharged.length > 0 ? <p><strong>Eliteゲージ技</strong><span>{details.moves.eliteCharged.join('・')}</span></p> : null}
              </section>
            ) : null}

            {details.evolutions?.length ? (
              <section className="raid-card__moves">
                <h4>進化先</h4>
                <p><span>{details.evolutions.join('・')}</span></p>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}

      <RaidCountersPanel
        bossSpeciesId={raid.speciesId}
        bossName={raid.displayName}
        bossTypes={raid.types}
      />
    </article>
  );
}
