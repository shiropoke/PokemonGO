import { describe, expect, it } from 'vitest';
import {
  isLikelyUntranslatedResearchText,
  localizeResearchText,
} from './scrapedDuckLocalization';

// 2026-08-25時点のScrapedDuck research.jsonにある全unique task.text。
const CURRENT_RESEARCH_TASKS = [
  'Catch 10 Fire-type Pokémon',
  'Catch 10 Grass-type Pokémon',
  'Catch 10 Water-type Pokémon',
  'Catch 15 Water-type Pokémon',
  'Catch 5 Pokémon with Weather Boost',
  'Catch 7 Pokémon',
  'Catch 7 different species of Pokémon',
  'Catch a Dragon-type Pokémon',
  'Defeat a Team GO Rocket Grunt',
  'Earn 2 Candies walking with your buddy',
  'Earn 3 Candies walking with your buddy',
  'Evolve a Pokémon',
  'Explore 2 km',
  'Explore 5 km',
  'Hatch 2 Eggs',
  'Hatch an Egg',
  'Make 10 Curveball Throws',
  'Make 10 Nice Throws',
  'Make 2 Excellent Throws',
  'Make 3 Excellent Throws in a row',
  'Make 3 Great Throws',
  'Make 3 Great Throws in a row',
  'Make 5 Great Curveball Throws in a row',
  'Make 5 Nice Throws',
  'Power up Pokémon 3 times',
  'Power up Pokémon 5 times',
  'Power up Pokémon 7 times',
  'Send 3 Gifts and add a sticker to each',
  'Spin 26 PokéStops or Gyms',
  'Spin 3 PokéStops or Gyms',
  'Spin 5 PokéStops or Gyms',
  'Take a snapshot of a wild Pokémon',
  'Trade a Pokémon',
  'Win 5 raids',
  'Win a raid',
  'Win a three-star raid or higher',
] as const;

describe('current ScrapedDuck research localization audit', () => {
  it('現行36タスクをすべて日本語化し、未翻訳英文を0件にする', () => {
    expect(CURRENT_RESEARCH_TASKS).toHaveLength(36);
    const unresolved = CURRENT_RESEARCH_TASKS.filter(isLikelyUntranslatedResearchText);
    expect(unresolved).toEqual([]);
    expect(CURRENT_RESEARCH_TASKS.map(localizeResearchText).every((text) => text.length > 0))
      .toBe(true);
  });
});
