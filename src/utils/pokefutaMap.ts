import type { Pokefuta } from '../types/pokefuta';

export const POKEFUTA_MAP_MAX_ZOOM = 15;

export interface PokefutaMapPoint {
  lid: Pokefuta;
  latitude: number;
  longitude: number;
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function createPokefutaMapPoints(lids: readonly Pokefuta[]): PokefutaMapPoint[] {
  return lids.flatMap((lid) =>
    isValidLatitude(lid.latitude) && isValidLongitude(lid.longitude)
      ? [{ lid, latitude: lid.latitude, longitude: lid.longitude }]
      : []);
}

export function createPokefutaMapBounds(
  points: readonly PokefutaMapPoint[],
): [number, number][] {
  return points.map(({ latitude, longitude }) => [latitude, longitude]);
}

function formatCoordinate(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '');
}

export function getPokefutaGoogleMapUrl(point: PokefutaMapPoint): string {
  return point.lid.mapUrl
    ?? `https://www.google.com/maps/search/?api=1&query=${formatCoordinate(point.latitude)},${formatCoordinate(point.longitude)}`;
}
