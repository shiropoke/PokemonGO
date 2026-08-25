import type { Pokefuta } from '../types/pokefuta';
import { createPokefutaMapPoints } from './pokefutaMap';

const CSV_HEADERS = ['Name', 'Address', 'Latitude', 'Longitude', 'Pokemon', 'Official URL'];

function protectCsvFormula(value: string): string {
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvCell(value: string | number, protectFormula = false): string {
  const text = protectFormula ? protectCsvFormula(String(value)) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function getPokefutaExportLids(lids: readonly Pokefuta[]): Pokefuta[] {
  return createPokefutaMapPoints(lids).map(({ lid }) => lid);
}

function createExportName(lid: Pokefuta): string {
  return `${lid.locationName || lid.municipality}のポケふた（${lid.pokemonNames.join('・')}）`;
}

export function createPokefutaCsv(lids: readonly Pokefuta[]): string {
  const rows = createPokefutaMapPoints(lids).map(({ lid, latitude, longitude }) => [
    escapeCsvCell(createExportName(lid), true),
    escapeCsvCell(lid.address, true),
    escapeCsvCell(latitude),
    escapeCsvCell(longitude),
    escapeCsvCell(lid.pokemonNames.join('・'), true),
    escapeCsvCell(lid.officialUrl),
  ].join(','));
  return `\uFEFF${CSV_HEADERS.join(',')}\r\n${rows.join('\r\n')}\r\n`;
}

export function createPokefutaKml(lids: readonly Pokefuta[]): string {
  const points = createPokefutaMapPoints(lids);
  const prefectureName = points[0]?.lid.prefecture ?? 'ポケふた';
  const placemarks = points.map(({ lid, latitude, longitude }) => {
    const description = [
      `住所: ${lid.address}`,
      `ポケモン: ${lid.pokemonNames.join('・')}`,
      `公式ページ: ${lid.officialUrl}`,
    ].join('\n');
    return [
      '    <Placemark>',
      `      <name>${escapeXml(createExportName(lid))}</name>`,
      `      <description>${escapeXml(description)}</description>`,
      '      <Point>',
      `        <coordinates>${longitude},${latitude},0</coordinates>`,
      '      </Point>',
      '    </Placemark>',
    ].join('\n');
  }).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    `    <name>${escapeXml(`${prefectureName}のポケふた`)}</name>`,
    placemarks,
    '  </Document>',
    '</kml>',
    '',
  ].join('\n');
}

export function getPokefutaExportFilename(
  prefectureSlug: string,
  extension: 'csv' | 'kml',
): string {
  const safeSlug = prefectureSlug.toLocaleLowerCase('en-US').replace(/[^a-z0-9-]/g, '') || 'prefecture';
  return `pokefuta-${safeSlug}.${extension}`;
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

