import { describe, expect, it } from 'vitest';
import {
  filterPokemonCenterStampRallyLocations,
  POKEMON_CENTER_STAMP_RALLY_LOCATIONS,
} from './pokemonCenterStampRally';

describe('Pokemon Center Stamp Rally locations', () => {
  it('registers all 18 campaign locations and keeps Pokémon GO Lab separate', () => {
    expect(POKEMON_CENTER_STAMP_RALLY_LOCATIONS).toHaveLength(18);
    const goLab = POKEMON_CENTER_STAMP_RALLY_LOCATIONS.find((location) => location.isGoLab);
    const megaTokyo = POKEMON_CENTER_STAMP_RALLY_LOCATIONS.find((location) => location.id === 'megatokyo');
    expect(goLab?.id).toBe('go-lab');
    expect(goLab?.id).not.toBe(megaTokyo?.id);
  });

  it('filters by region and searchable official location fields', () => {
    expect(filterPokemonCenterStampRallyLocations(POKEMON_CENTER_STAMP_RALLY_LOCATIONS, '', '関西'))
      .toHaveLength(3);
    expect(filterPokemonCenterStampRallyLocations(POKEMON_CENTER_STAMP_RALLY_LOCATIONS, 'オーサカ', 'all'))
      .toHaveLength(2);
    expect(filterPokemonCenterStampRallyLocations(POKEMON_CENTER_STAMP_RALLY_LOCATIONS, '大阪府', 'all'))
      .toHaveLength(2);
    expect(
      filterPokemonCenterStampRallyLocations(POKEMON_CENTER_STAMP_RALLY_LOCATIONS, '梅田', 'all')
        .map((location) => location.id),
    ).toEqual(['osaka']);
  });

  it('uses official store pages and HTTPS Google Maps URLs', () => {
    for (const location of POKEMON_CENTER_STAMP_RALLY_LOCATIONS) {
      expect(location.officialUrl).toMatch(/^https:\/\/shop\.pokemon\.co\.jp\/ja\//);
      expect(location.googleMapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//);
    }
  });
});
