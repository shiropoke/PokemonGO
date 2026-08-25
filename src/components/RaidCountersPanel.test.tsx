import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RAID_COUNTER_LEVEL,
  RAID_COUNTER_LEVELS,
  RaidCountersPanel,
} from './RaidCountersPanel';

describe('RaidCountersPanel', () => {
  it('初期強化レベルはPL50で、PL40も選択肢として維持する', () => {
    expect(DEFAULT_RAID_COUNTER_LEVEL).toBe(50);
    expect(RAID_COUNTER_LEVELS).toEqual([40, 50]);
    const markup = renderToStaticMarkup(
      <RaidCountersPanel
        bossSpeciesId="mewtwo"
        bossName="ミュウツー"
        bossTypes={['psychic']}
      />,
    );

    expect(markup).toContain('対策を見る');
  });
});
