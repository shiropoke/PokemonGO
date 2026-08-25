import { useEffect, useMemo, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import type { Pokefuta } from '../types/pokefuta';
import {
  createPokefutaMapBounds,
  createPokefutaMapPoints,
  getPokefutaGoogleMapUrl,
  POKEFUTA_MAP_MAX_ZOOM,
  type PokefutaMapPoint,
} from '../utils/pokefutaMap';

interface PokefutaMapProps {
  lids: readonly Pokefuta[];
  prefectureName: string;
}

function createPopupContent(point: PokefutaMapPoint): HTMLElement {
  const container = document.createElement('div');
  container.className = 'pokefuta-map-popup';

  const title = document.createElement('strong');
  title.textContent = point.lid.pokemonNames.join('・');
  container.append(title);

  const location = document.createElement('span');
  location.textContent = point.lid.locationName || point.lid.municipality;
  container.append(location);

  const address = document.createElement('span');
  address.textContent = point.lid.address;
  container.append(address);

  const link = document.createElement('a');
  link.href = getPokefutaGoogleMapUrl(point);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Googleマップで開く';
  container.append(link);

  return container;
}

export function PokefutaMap({ lids, prefectureName }: PokefutaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const points = useMemo(() => createPokefutaMapPoints(lids), [lids]);
  const missingCount = lids.length - points.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || points.length === 0) return undefined;
    let cancelled = false;
    let map: LeafletMap | null = null;
    let animationFrame = 0;

    void import('leaflet').then((L) => {
      if (cancelled || !container.isConnected) return;
      const defaultIcon = L.icon({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      map = L.map(container, {
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      for (const point of points) {
        L.marker([point.latitude, point.longitude], { icon: defaultIcon })
          .addTo(map)
          .bindPopup(createPopupContent(point), { maxWidth: 260 });
      }

      map.fitBounds(L.latLngBounds(createPokefutaMapBounds(points)), {
        animate: false,
        maxZoom: POKEFUTA_MAP_MAX_ZOOM,
        padding: [24, 24],
      });
      animationFrame = window.requestAnimationFrame(() => map?.invalidateSize(false));
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      map?.remove();
      map = null;
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <section className="pokefuta-map-section" aria-labelledby="pokefuta-map-heading">
      <div className="pokefuta-map-section__heading">
        <h3 id="pokefuta-map-heading">ポケふたマップ</h3>
        <span>マップ表示 {points.length}枚</span>
      </div>
      <div
        ref={containerRef}
        className="pokefuta-map"
        aria-label={`${prefectureName}のポケふたマップ`}
        data-horizontal-scroll
        data-main-tab-swipe-ignore
      />
      {missingCount > 0 ? (
        <p className="pokefuta-map__notice">
          {missingCount}件は座標情報を取得できないためマップに表示されていません。
        </p>
      ) : null}
    </section>
  );
}

