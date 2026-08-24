import type { RaidBoss } from '../types/scrapedDuck';
import { getRaidTierLabel } from '../utils/scrapedDuckLocalization';
import { getTypeWeaknesses } from '../utils/typeEffectiveness';
import { DatasetImage } from './DatasetImage';
import { FavoriteButton } from './FavoriteButton';
import { RaidCountersPanel } from './RaidCountersPanel';
import { TypeBadge } from './TypeBadge';

export function RaidCard({ raid }: { raid: RaidBoss }) {
  const weaknesses = getTypeWeaknesses(raid.types);

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
              <dt>天候ブースト</dt>
              <dd>{raid.combatPower.boosted.min}～{raid.combatPower.boosted.max}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <RaidCountersPanel
        bossSpeciesId={raid.speciesId}
        bossName={raid.displayName}
        bossTypes={raid.types}
      />
    </article>
  );
}
